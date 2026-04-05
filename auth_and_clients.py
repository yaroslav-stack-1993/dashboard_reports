import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

API_URL = "https://api.direct.yandex.com/json/v5/agencyclients"


def _get_tokens() -> list[str]:
    """Читает все доступные токены из переменных YANDEX_TOKEN_1, YANDEX_TOKEN_2, ..."""
    tokens = []
    i = 1
    while True:
        token = os.getenv(f"YANDEX_TOKEN_{i}")
        if not token or token.startswith("вставь_"):
            break
        tokens.append(token)
        i += 1
    if not tokens:
        raise EnvironmentError("Не задан ни один токен. Укажите YANDEX_TOKEN_1 (и YANDEX_TOKEN_2) в файле .env")
    return tokens


def _fetch_clients_for_token(token: str, account_index: int) -> list[dict]:
    """Получает список клиентов для одного управляющего аккаунта."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept-Language": "ru",
        "Content-Type": "application/json",
    }
    payload = {
        "method": "get",
        "params": {
            "FieldNames": ["Login", "ClientInfo"],
            "Page": {"Limit": 10000},
        },
    }

    try:
        response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"[Аккаунт {account_index}] HTTP-ошибка: {e}") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"[Аккаунт {account_index}] Ошибка соединения: {e}") from e

    data = response.json()

    if "error" in data:
        err = data["error"]
        raise RuntimeError(
            f"[Аккаунт {account_index}] Ошибка API [{err.get('error_code')}]: "
            f"{err.get('error_detail', err.get('error_string'))}"
        )

    clients_raw = data.get("result", {}).get("Clients", [])

    if not clients_raw:
        logger.warning("[Аккаунт %d] API вернул пустой список клиентов", account_index)
        return []

    clients = [
        {
            "login": c.get("Login", ""),
            "name": c.get("ClientInfo", {}).get("Name", ""),
            "token": token,
            "account": account_index,
        }
        for c in clients_raw
    ]

    logger.info("[Аккаунт %d] Найдено клиентов: %d", account_index, len(clients))
    return clients


def get_agency_clients() -> list[dict]:
    """
    Возвращает объединённый список клиентов всех управляющих аккаунтов.

    Returns:
        [{"login": "...", "name": "...", "token": "...", "account": 1}, ...]
    """
    tokens = _get_tokens()
    all_clients = []

    for i, token in enumerate(tokens, start=1):
        try:
            clients = _fetch_clients_for_token(token, i)
            all_clients.extend(clients)
        except RuntimeError as e:
            logger.error("Ошибка получения клиентов: %s", e)

    logger.info("Итого клиентов по всем аккаунтам: %d", len(all_clients))
    return all_clients


if __name__ == "__main__":
    clients = get_agency_clients()
    for client in clients:
        print(f"[Аккаунт {client['account']}] {client['login']}: {client['name']}")
