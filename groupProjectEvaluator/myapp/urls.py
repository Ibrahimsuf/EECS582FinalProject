from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TaskViewSet,
    SprintViewSet,
    MemberViewSet,
    GroupViewSet,
    ProjectViewSet,
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

urlpatterns = [
    path("auth/register/", register),
    path("auth/login/", login),
    path("groups/join/", join_group),
    path("", include(router.urls)),
]