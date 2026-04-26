from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DisputeViewSet,
    GroupViewSet,
    MemberViewSet,
    ProjectViewSet,
    SprintContributionViewSet,
    SprintViewSet,
    TaskViewSet,
    github_contributions,
    instructor_discrepancy_dashboard,
    join_group,
    leave_group,
    login,
    register,
    TaskCommentViewSet,
)

router = DefaultRouter()
router.register(r"tasks", TaskViewSet)
router.register(r"sprints", SprintViewSet)
router.register(r"members", MemberViewSet)
router.register(r"groups", GroupViewSet)
router.register(r"projects", ProjectViewSet)
router.register(r"contributions", SprintContributionViewSet)
router.register(r"disputes", DisputeViewSet)
router.register(r"task-comments", TaskCommentViewSet)

urlpatterns = [
    path("auth/register/", register),
    path("auth/login/", login),
    path("groups/join/", join_group),
    path("groups/leave/", leave_group),
    path("members/<int:member_id>/github/", github_contributions, name="github_contributions"),
    path("dashboard/instructor-discrepancy/", instructor_discrepancy_dashboard, name="instructor_discrepancy_dashboard"),
    path("", include(router.urls)),
]
