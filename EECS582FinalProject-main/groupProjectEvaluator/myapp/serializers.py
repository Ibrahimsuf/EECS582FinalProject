from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Task, Sprint, Member, Project, Group, User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model - used for displaying user info"""
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'username', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['email', 'name', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email'].lower()).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        email = validated_data['email'].lower()
        
        # Generate username from email
        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User.objects.create_user(
            username=username,
            email=email,
            name=validated_data.get('name', ''),
            password=validated_data['password']
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change endpoint"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, validators=[validate_password], write_only=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset"""
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset"""
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, validators=[validate_password], write_only=True)


class SprintSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
    class Meta:
        model = Sprint
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'owner', 'owner_email', 'created_at']
        read_only_fields = ['id', 'created_at', 'owner_email', 'owner']


class TaskSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'sprint', 'owner', 'owner_email', 'member', 'created_at']
        read_only_fields = ['id', 'created_at', 'owner_email', 'owner']

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = '__all__'

class ProjectsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class GroupSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'join_code', 'owner', 'owner_email', 'member_count', 'created_at']
        read_only_fields = ['id', 'join_code', 'created_at', 'owner_email', 'member_count', 'owner']
    
    def get_member_count(self, obj):
        return obj.members.count()


class JoinGroupSerializer(serializers.Serializer):
    """Serializer for joining a group via join code"""
    join_code = serializers.CharField(max_length=8, required=True)

