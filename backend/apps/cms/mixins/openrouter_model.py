import requests
from sqlalchemy.orm import Session


class OpenRouterModelMixin:
    """Business logic for OpenRouter models: cron-based API fetching."""

    def cron_fetch_openrouter_model(self, db: Session):
        from settings import DEFAULT_ORG_ID

        url = "https://openrouter.ai/api/v1/models"

        try:
            response = requests.get(url, timeout=30)
            data = response.json().get("data", [])

            for model_data in data:
                model = self.__class__(
                    string_id=model_data.get("id"),
                    canonical_slug=model_data.get("canonical_slug"),
                    hugging_face_id=model_data.get("hugging_face_id"),
                    name=model_data.get("name"),
                    description=model_data.get("description"),
                    context_length=model_data.get("context_length"),
                    created=model_data.get("created"),
                    architecture=model_data.get("architecture"),
                    pricing=model_data.get("pricing"),
                    top_provider=model_data.get("top_provider"),
                    per_request_limits=model_data.get("per_request_limits"),
                    supported_parameters=model_data.get("supported_parameters"),
                    organization_id=DEFAULT_ORG_ID,
                )

                existing = (
                    db.query(self.__class__)
                    .filter(self.__class__.string_id == model.string_id)
                    .first()
                )
                if existing:
                    # Map API data to model fields, handling id -> string_id mapping
                    for key, value in model_data.items():
                        if key == "id":
                            # API's "id" field maps to our "string_id" field
                            setattr(existing, "string_id", value)
                        elif hasattr(existing, key) and key != "id":
                            # Set other fields, but skip "id" to avoid overwriting primary key
                            setattr(existing, key, value)
                else:
                    db.add(model)

            db.commit()

        except Exception as e:
            db.rollback()
            raise e
