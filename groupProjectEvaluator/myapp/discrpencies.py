# myapp/tasks.py

def flag_overdue_tasks_as_disputes():
    """
    Runs at end of day. Finds all incomplete tasks whose sprint has ended,
    checks whether any assigned member has submitted a contribution covering
    that task, and opens a Dispute against members who haven't.
    """
    today = date.today()

    overdue_tasks = Task.objects.filter(
        sprint__end_date__lt=today,
    ).exclude(
        status="DONE",
    ).select_related(
        "sprint",
        "created_by",
    ).prefetch_related(
        "member",
        "discrepancies",
        "contribution_entries",
    )

    disputes_opened = 0

    for task in overdue_tasks:
        # Members who have a contribution entry covering this task
        members_with_contribution = set(
            task.contribution_entries.values_list("member_id", flat=True)
        )

        # Members who have a non-negative user_contribution discrepancy
        members_with_discrepancy = set(
            task.discrepancies.filter(
                user_contribution__gte=0
            ).values_list("member_id", flat=True)
        )

        members_accounted_for = members_with_contribution | members_with_discrepancy

        # The "accuser" for auto-generated disputes — fall back to any group PM
        raiser = task.created_by or _get_fallback_raiser(task)
        if raiser is None:
            logger.warning(
                "Task %s (%d) has no created_by and no PM — skipping.", task.title, task.pk
            )
            continue

        for member in task.member.all():
            if member.pk in members_accounted_for:
                continue  # already has a contribution, skip

            # Avoid duplicate open disputes for the same task/member pair
            already_disputed = Dispute.objects.filter(
                accused_member=member,
                tasks_affected=task,
                status__in=("OPEN", "UNDER_REVIEW"),
            ).exists()

            if already_disputed:
                continue

            dispute = Dispute.objects.create(
                raised_by=raiser,
                accused_member=member,
                sprint=task.sprint,
                description=(
                    f"Auto-generated: Task \"{task.title}\" was not completed by the "
                    f"end of sprint \"{task.sprint}\" ({task.sprint.end_date}), and "
                    f"{member.name} has no recorded contribution for it."
                ),
                status="OPEN",
            )
            dispute.tasks_affected.add(task)

            disputes_opened += 1
            logger.info(
                "Opened dispute %d against %s for task \"%s\".",
                dispute.pk, member.name, task.title,
            )

    logger.info("flag_overdue_tasks_as_disputes complete — %d dispute(s) opened.", disputes_opened)


def _get_fallback_raiser(task: Task) -> Member | None:
    """Returns a Project Manager from the task's sprint group, if one exists."""
    sprint = task.sprint
    if sprint and sprint.group:
        return (
            sprint.group.members
            .filter(roles="PROJECT_MANAGER")
            .first()
        )
    return None