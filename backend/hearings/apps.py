from django.apps import AppConfig


class HearingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hearings'
    verbose_name = 'Hearing Management'

    def ready(self):
        import hearings.signals  # noqa