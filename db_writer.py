import csv
import io
import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _get_supabase_headers() -> dict:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise EnvironmentError("SUPABASE_URL или SUPABASE_KEY не заданы в .env")
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"}


def _get_supabase_url() -> str:
    return os.getenv("SUPABASE_URL").rstrip("/")


def _tsv_to_rows(client_login: str, tsv: str) -> list[dict]:
    """Конвертирует TSV-строку в список словарей для вставки в БД."""
    reader = csv.DictReader(io.StringIO(tsv.strip()), delimiter="\t")
    rows = []
    for row in reader:
        rows.append({
            "client_login":        client_login,
            "date":                row.get("Date") or None,
            "campaign_id":         int(row["CampaignId"]) if row.get("CampaignId") and row["CampaignId"] != "--" else None,
            "campaign_name":       row.get("CampaignName") or None,
            "ad_group_id":         int(row["AdGroupId"]) if row.get("AdGroupId") and row["AdGroupId"] != "--" else None,
            "ad_id":               int(row["AdId"]) if row.get("AdId") and row["AdId"] != "--" else None,
            "clicks":              int(row["Clicks"]) if row.get("Clicks") and row["Clicks"] != "--" else 0,
            "impressions":         int(row["Impressions"]) if row.get("Impressions") and row["Impressions"] != "--" else 0,
            "ctr":                 float(row["Ctr"]) if row.get("Ctr") and row["Ctr"] != "--" else 0,
            "cost":                float(row["Cost"]) if row.get("Cost") and row["Cost"] != "--" else 0,
            "conversions":         int(row["Conversions"]) if row.get("Conversions") and row["Conversions"] != "--" else 0,
            "cost_per_conversion": float(row["CostPerConversion"]) if row.get("CostPerConversion") and row["CostPerConversion"] != "--" else 0,
        })
    return rows


def write_stats(client_login: str, tsv: str) -> int:
    """
    Сохраняет TSV-статистику клиента в Supabase.
    Дубликаты обновляются (upsert по уникальному индексу).

    Returns:
        Количество записанных строк
    """
    if not tsv or not tsv.strip():
        logger.warning("[%s] Пустые данные, пропуск записи", client_login)
        return 0

    rows = _tsv_to_rows(client_login, tsv)
    if not rows:
        logger.warning("[%s] Нет строк для записи", client_login)
        return 0

    # Supabase принимает максимум 1000 строк за раз — разбиваем на чанки
    chunk_size = 500
    total_written = 0

    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i + chunk_size]
        response = requests.post(
            f"{_get_supabase_url()}/rest/v1/ad_stats",
            json=chunk,
            headers=_get_supabase_headers(),
            timeout=30,
        )
        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"[{client_login}] Ошибка записи в Supabase (HTTP {response.status_code}): {response.text}"
            )
        total_written += len(chunk)

    logger.info("[%s] Записано строк в БД: %d", client_login, total_written)
    return total_written


def write_all_stats(stats: dict[str, str]) -> None:
    """
    Записывает статистику всех клиентов в Supabase.

    Args:
        stats: словарь {"client_login": "tsv_data", ...} из collect_all_stats()
    """
    total_clients = len(stats)
    success = 0

    for login, tsv in stats.items():
        try:
            write_stats(login, tsv)
            success += 1
        except (RuntimeError, EnvironmentError) as e:
            logger.error("[%s] Ошибка записи: %s", login, e)

    logger.info("Запись завершена. Успешно: %d / %d", success, total_clients)


if __name__ == "__main__":
    from auth_and_clients import get_agency_clients
    from stats_collector import collect_all_stats

    clients = get_agency_clients()
    stats = collect_all_stats(clients)
    write_all_stats(stats)
