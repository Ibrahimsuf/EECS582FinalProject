from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TaskViewSet,
    SprintViewSet,
    MemberViewSet,
    GroupViewSet,
    ProjectViewSet,
    SprintContributionViewSet,
    DisputeViewSet,
    register,
    login,
    join_group,
)

router = DefaultRouter()
router.register(r"tasks", TaskViewSet)
router.register(r"sprints", SprintViewSet)
router.register(r"members", MemberViewSet)
router.register(r"groups", GroupViewSet)
router.register(r"projects", ProjectViewSet)
router.register(r"contributions", SprintContributionViewSet)
router.register(r"disputes", DisputeViewSet)

urlpatterns = [
    path("auth/register/", register),
    path("auth/login/", login),
    path("groups/join/", join_group),
    path("", include(router.urls)),
]