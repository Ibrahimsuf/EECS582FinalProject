# myapp/management/commands/seed.py
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from myapp.models import (
    Group, Sprint, Project, Member,
    Task, Story_Point_Estimates, SprintContribution, Dispute
)

fake = Faker()

class Command(BaseCommand):
    help = 'Seed the database with fake data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding...')

        # Clear existing data
        Dispute.objects.all().delete()
        SprintContribution.objects.all().delete()
        Story_Point_Estimates.objects.all().delete()
        Task.objects.all().delete()
        Sprint.objects.all().delete()
        Project.objects.all().delete()
        Member.objects.all().delete()
        Group.objects.all().delete()

        # Groups
        groups = []
        for i in range(3):
            group = Group.objects.create(
                name=f"Group {fake.word().capitalize()}",
                group_code=fake.unique.random_int(min=1000, max=9999),
            )
            groups.append(group)

        # Projects
        projects = []
        for group in groups:
            for _ in range(2):
                start = fake.date_between(start_date='-6m', end_date='today')
                project = Project.objects.create(
                    name=fake.bs().title(),
                    start_date=start,
                    end_date=start + timedelta(days=random.randint(30, 90)),
                    group=group,
                )
                projects.append(project)

        # Sprints
        sprints = []
        for group in groups:
            for i in range(3):
                start = fake.date_between(start_date='-3m', end_date='today')
                sprint = Sprint.objects.create(
                    name=f"Sprint {i + 1}",
                    start_date=start,
                    end_date=start + timedelta(days=14),
                    is_active=(i == 2),
                    group=group,
                )
                sprints.append(sprint)

        # Members
        members = []
        for i in range(12):
            first = fake.first_name()
            last = fake.last_name()
            member = Member.objects.create(
                name=f"{first} {last}",
                first_name=first,
                last_name=last,
                email=fake.unique.email(),
                username=fake.unique.user_name(),
                password="password123",
                roles=random.choice(["PROJECT_MANAGER", "TEAM_MEMBER"]),
                university=fake.company() + " University",
                address={
                    "street": fake.street_address(),
                    "city": fake.city(),
                    "state": fake.state(),
                    "zip": fake.zipcode(),
                },
            )
            # Assign to random groups and projects
            member.group.set(random.sample(groups, k=random.randint(1, 2)))
            member.project.set(random.sample(projects, k=random.randint(1, 3)))
            members.append(member)

        # Tasks
        tasks = []
        statuses = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"]
        for sprint in sprints:
            for _ in range(random.randint(4, 8)):
                task = Task.objects.create(
                    title=fake.sentence(nb_words=6).rstrip('.'),
                    description=fake.paragraph(),
                    status=random.choice(statuses),
                    sprint=sprint,
                )
                task.member.set(random.sample(members, k=random.randint(1, 3)))
                tasks.append(task)

        # Story Point Estimates
        for sprint in sprints:
            for member in random.sample(members, k=4):
                Story_Point_Estimates.objects.create(
                    point_estimate=random.choice([1, 2, 3, 5, 8, 13]),
                    sprint=sprint,
                    member=member,
                )

        # Sprint Contributions
        contributions = []
        for sprint in sprints:
            for member in random.sample(members, k=random.randint(3, 6)):
                sprint_tasks = list(sprint.tasks.all())
                contrib = SprintContribution.objects.create(
                    member=member,
                    sprint=sprint,
                    description=fake.paragraph(),
                    story_points=random.choice([1, 2, 3, 5, 8]),
                    hours_worked=round(random.uniform(2, 40), 2),
                )
                if sprint_tasks:
                    contrib.tasks_handled.set(random.sample(sprint_tasks, k=min(3, len(sprint_tasks))))
                contributions.append(contrib)

        # Disputes
        for _ in range(6):
            raiser, accused = random.sample(members, k=2)
            sprint = random.choice(sprints)
            contrib = SprintContribution.objects.filter(member=accused, sprint=sprint).first()
            dispute = Dispute.objects.create(
                raised_by=raiser,
                accused_member=accused,
                sprint=sprint,
                contribution=contrib,
                description=fake.paragraph(),
                status=random.choice(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
            )
            sprint_tasks = list(sprint.tasks.all())
            if sprint_tasks:
                dispute.tasks_affected.set(random.sample(sprint_tasks, k=min(2, len(sprint_tasks))))

        self.stdout.write(self.style.SUCCESS('Done! Database seeded successfully.'))