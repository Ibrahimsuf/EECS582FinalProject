from django.apps import AppConfig
from django_q.models import Schedule
from django_q.tasks import schedule


class MyappConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from django_q.models import Schedule

        # Keep the scheduled cleanup job idempotent across app restarts.
        Schedule.objects.update_or_create(
            name="get_discrepencies",
            defaults={
                "func": "myapp.discrpencies.flag_overdue_tasks_as_disputes",
                "schedule_type": Schedule.CRON,
                "cron": "0 23 * * *",
            },
        )
