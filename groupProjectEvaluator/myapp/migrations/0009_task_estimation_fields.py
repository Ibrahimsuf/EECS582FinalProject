from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("myapp", "0008_member_github_google"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="actual_hours",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name="task",
            name="ai_estimated_hours",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name="task",
            name="discrepancy_rating",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6),
        ),
        migrations.AddField(
            model_name="task",
            name="estimated_hours",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name="task",
            name="estimation_analysis",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="task",
            name="is_estimation_outlier",
            field=models.BooleanField(default=False),
        ),
    ]
