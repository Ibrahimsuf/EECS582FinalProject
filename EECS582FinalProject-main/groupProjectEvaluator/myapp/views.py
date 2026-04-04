from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

from django.db import models
from .models import Task, Sprint, Group, User
from .serializers import (
    TaskSerializer, SprintSerializer, GroupSerializer,
    RegisterSerializer, UserSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    JoinGroupSerializer
)


# ============== Authentication Views ==============

class RegisterView(generics.CreateAPIView):
    """
    API endpoint for user registration.
    POST /api/auth/register/
    Body: {"email": "user@example.com", "name": "John Doe", "password": "securepass", "password2": "securepass"}
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    API endpoint for user login.
    POST /api/auth/login/
    Body: {"email": "user@example.com", "password": "securepass", "remember_me": true}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower()
        password = request.data.get('password', '')
        remember_me = request.data.get('remember_me', False)

        if not email or not password:
            return Response(
                {'error': 'Please provide both email and password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate with email (since email is our USERNAME_FIELD)
        user_auth = authenticate(username=email, password=password)
        
        if user_auth is None:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user_auth)
        
        # Adjust token lifetime based on remember_me
        if remember_me:
            # Token already configured for 30 days in settings
            pass
        else:
            # Shorter refresh token lifetime (1 day)
            from datetime import timedelta
            refresh.set_exp(lifetime=timedelta(days=1))

        return Response({
            'user': UserSerializer(user_auth).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    API endpoint for user logout (blacklist refresh token).
    POST /api/auth/logout/
    Body: {"refresh": "refresh_token"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """
    API endpoint to get current authenticated user.
    GET /api/auth/me/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update user profile"""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    API endpoint for changing password.
    POST /api/auth/change-password/
    Body: {"old_password": "oldpass", "new_password": "newpass"}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.data.get('old_password')):
                return Response(
                    {'error': 'Old password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user.set_password(serializer.data.get('new_password'))
            user.save()
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    API endpoint for requesting password reset.
    POST /api/auth/password-reset/
    Body: {"email": "user@example.com"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.data.get('email').lower()
            try:
                user = User.objects.get(email=email)
                # Generate reset token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # In a real app, send this via email
                # For demo purposes, we'll return it in the response
                reset_link = f"http://localhost:3000/reset-password/{uid}/{token}"
                
                # TODO: Uncomment to send email in production
                # send_mail(
                #     'Password Reset Request',
                #     f'Click the link to reset your password: {reset_link}',
                #     settings.DEFAULT_FROM_EMAIL,
                #     [email],
                #     fail_silently=False,
                # )
                
                return Response({
                    'message': 'Password reset link sent (check console for demo)',
                    'reset_link': reset_link,  # Remove this in production
                    'token': token,
                    'uid': uid
                }, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                # Don't reveal if email exists for security
                return Response({
                    'message': 'If the email exists, a reset link has been sent'
                }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    API endpoint for confirming password reset.
    POST /api/auth/password-reset-confirm/
    Body: {"uid": "...", "token": "...", "password": "newpass"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password')
        
        if not all([uid, token, password]):
            return Response(
                {'error': 'uid, token, and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            if default_token_generator.check_token(user, token):
                user.set_password(password)
                user.save()
                return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)


# ============== Resource Views ==============

class TaskViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Task management.
    Only shows tasks owned by the authenticated user.
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter tasks to show only the user's own tasks.
        Optional: Allow filtering by sprint via URL.
        Example: /api/tasks/?sprint_id=1
        """
        queryset = Task.objects.filter(owner=self.request.user)
        sprint_id = self.request.query_params.get('sprint_id')
        if sprint_id is not None:
            queryset = queryset.filter(sprint_id=sprint_id)
        return queryset

    def perform_create(self, serializer):
        """Automatically set the owner to the current user"""
        serializer.save(owner=self.request.user)


class SprintViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Sprint management.
    Only shows sprints owned by the authenticated user.
    """
    serializer_class = SprintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter sprints to show only the user's own sprints"""
        return Sprint.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        """Automatically set the owner to the current user"""
        serializer.save(owner=self.request.user)


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Group management.
    Shows groups owned by the user or groups they are a member of.
    """
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter groups to show:
        - Groups owned by the user
        - Groups where the user is a member
        """
        user = self.request.user
        return Group.objects.filter(
            models.Q(owner=user) | models.Q(members=user)
        ).distinct()

    def perform_create(self, serializer):
        """Automatically set the owner to the current user and add them as a member"""
        group = serializer.save(owner=self.request.user)
        group.members.add(self.request.user)

    def update(self, request, *args, **kwargs):
        """Only allow owner to update the group"""
        group = self.get_object()
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can update the group'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Only allow owner to delete the group"""
        group = self.get_object()
        if group.owner != request.user:
            return Response(
                {'error': 'Only the group owner can delete the group'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='join')
    def join_group(self, request):
        """
        Join a group using a join code.
        POST /api/groups/join/
        Body: {"join_code": "ABC12345"}
        """
        serializer = JoinGroupSerializer(data=request.data)
        if serializer.is_valid():
            join_code = serializer.data.get('join_code').upper()
            try:
                group = Group.objects.get(join_code=join_code)
                if request.user in group.members.all():
                    return Response(
                        {'message': 'You are already a member of this group'},
                        status=status.HTTP_200_OK
                    )
                group.members.add(request.user)
                return Response(
                    {
                        'message': f'Successfully joined group: {group.name}',
                        'group': GroupSerializer(group).data
                    },
                    status=status.HTTP_200_OK
                )
            except Group.DoesNotExist:
                return Response(
                    {'error': 'Invalid join code'},
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
