from django.apps import AppConfig
from django_q.models import Schedule
from django_q.tasks import schedule


class MyappConfig(AppConfig):
    name = "myapp"
    def ready(self):
        # Avoid creating duplicates on every restart
        if not Schedule.objects.filter(name='daily_cleanup').exists():
            schedule(
                'myapp.tasks.daily_cleanup',
                name='get_discrepencies',
                schedule_type=Schedule.CRON,
                cron='0 23 * * *',  # 11 PM — adjust to your end-of-day
            )
