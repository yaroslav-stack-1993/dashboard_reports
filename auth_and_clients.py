import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

API_URL = "https://api.direct.yandex.com/json/v5/agencyclients"


def get_agency_clients() -> list[dict]:
    token = os.getenv("YANDEX_TOKEN")
    if not token:
        raise EnvironmentError("YANDEX_TOKEN не задан. Укажите токен в переменной окружения или файле .env")

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
        raise RuntimeError(f"HTTP-ошибка при запросе к API: {e}") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Ошибка соединения с API: {e}") from e

    data = response.json()

    if "error" in data:
        err = data["error"]
        raise RuntimeError(
            f"Ошибка API Яндекс Директ [{err.get('error_code')}]: {err.get('error_detail', err.get('error_string'))}"
        )

    clients_raw = data.get("result", {}).get("Clients", [])

    if not clients_raw:
        logger.warning("API вернул пустой список клиентов")
        return []

    clients = [
        {
            "login": c.get("Login", ""),
            "name": c.get("ClientInfo", {}).get("Name", ""),
        }
        for c in clients_raw
    ]

    logger.info("Найдено клиентов агентства: %d", len(clients))
    return clients


if __name__ == "__main__":
    clients = get_agency_clients()
    for client in clients:
        print(f"{client['login']}: {client['name']}")
