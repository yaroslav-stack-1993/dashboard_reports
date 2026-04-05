import logging
import time

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

API_URL = "https://api.direct.yandex.com/json/v5/reports"
POLL_INTERVAL = 60      # секунд между попытками
TIMEOUT_MINUTES = 30    # максимальное время ожидания
CLIENT_DELAY = 5        # задержка между клиентами

REPORT_FIELDS = [
    "Date", "CampaignId", "CampaignName", "AdGroupId", "AdId",
    "Clicks", "Impressions", "Ctr", "Cost", "Conversions", "CostPerConversion",
]


def fetch_stats(client_login: str, date_from: str, date_to: str, token: str) -> str:
    """
    Запрашивает AD_PERFORMANCE_REPORT для клиента в офлайн-режиме.

    Args:
        client_login: логин клиента агентства
        date_from: начало периода в формате YYYY-MM-DD
        date_to: конец периода в формате YYYY-MM-DD
        token: OAuth-токен управляющего аккаунта клиента

    Returns:
        Содержимое отчёта в формате TSV (строка)

    Raises:
        TimeoutError: отчёт не готов за TIMEOUT_MINUTES минут
        RuntimeError: ошибка API
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept-Language": "ru",
        "Client-Login": client_login,
        "processingMode": "offline",
        "returnMoneyInMicros": "false",
        "skipReportHeader": "true",
        "skipReportSummary": "true",
    }

    payload = {
        "params": {
            "SelectionCriteria": {
                "DateFrom": date_from,
                "DateTo": date_to,
            },
            "FieldNames": REPORT_FIELDS,
            "ReportName": f"AD_PERFORMANCE_{client_login}_{date_from}",
            "ReportType": "AD_PERFORMANCE_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "YES",
        }
    }

    logger.info("[%s] Запрос отчёта за %s – %s", client_login, date_from, date_to)

    deadline = time.time() + TIMEOUT_MINUTES * 60
    attempt = 0

    while True:
        attempt += 1
        try:
            response = requests.post(API_URL, json=payload, headers=headers, timeout=60)
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"[{client_login}] Ошибка соединения: {e}") from e

        status = response.status_code

        if status == 200:
            logger.info("[%s] Отчёт готов (попытка %d)", client_login, attempt)
            return response.text

        if status in (201, 202):
            elapsed = int(time.time() - (deadline - TIMEOUT_MINUTES * 60))
            logger.info(
                "[%s] Статус %d — отчёт формируется, ожидание %d с (попытка %d)",
                client_login, status, elapsed, attempt,
            )
            if time.time() + POLL_INTERVAL > deadline:
                raise TimeoutError(
                    f"[{client_login}] Отчёт не готов за {TIMEOUT_MINUTES} минут"
                )
            time.sleep(POLL_INTERVAL)
            continue

        try:
            error_body = response.json()
            error_detail = error_body.get("error", {}).get("error_detail", response.text)
        except Exception:
            error_detail = response.text

        raise RuntimeError(
            f"[{client_login}] Ошибка API (HTTP {status}): {error_detail}"
        )


def collect_all_stats(clients_list: list[dict]) -> dict[str, str]:
    """
    Собирает статистику за вчерашний день для каждого клиента из списка.

    Args:
        clients_list: список словарей вида
            [{"login": "...", "name": "...", "token": "...", "account": 1}, ...]

    Returns:
        Словарь {"client_login": "tsv_data", ...}
        Клиенты с ошибками пропускаются (ошибка логируется).
    """
    from datetime import date, timedelta

    yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")

    results: dict[str, str] = {}

    for i, client in enumerate(clients_list):
        login = client.get("login", "")
        name = client.get("name", login)
        token = client.get("token", "")
        account = client.get("account", "?")

        if not login:
            logger.warning("Пропуск клиента без логина: %s", client)
            continue

        if not token:
            logger.error("[%s] Нет токена, пропуск", login)
            continue

        logger.info(
            "--- [%d/%d] Клиент: %s (%s) | Аккаунт %s ---",
            i + 1, len(clients_list), login, name, account,
        )

        try:
            tsv = fetch_stats(login, yesterday, yesterday, token)
            results[login] = tsv
            logger.info("[%s] Успешно. Строк данных: %d", login, tsv.count("\n"))
        except (TimeoutError, RuntimeError) as e:
            logger.error("[%s] Ошибка: %s", login, e)

        if i < len(clients_list) - 1:
            logger.debug("Пауза %d с перед следующим клиентом", CLIENT_DELAY)
            time.sleep(CLIENT_DELAY)

    logger.info("Сбор завершён. Успешно: %d / %d", len(results), len(clients_list))
    return results


if __name__ == "__main__":
    from auth_and_clients import get_agency_clients

    clients = get_agency_clients()
    stats = collect_all_stats(clients)

    for login, tsv in stats.items():
        lines = tsv.strip().splitlines()
        print(f"\n=== {login} ({len(lines)} строк) ===")
        if lines:
            print(lines[0])
            print(lines[1] if len(lines) > 1 else "(нет данных)")
