from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("myapp", "0005_dispute_contribution"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="requirements",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="task",
            name="created_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_tasks", to="myapp.member"),
        ),
        migrations.AddField(
            model_name="task",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=None),
            preserve_default=False,
        ),
    ]
