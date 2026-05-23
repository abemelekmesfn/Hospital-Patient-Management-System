from rest_framework import serializers
from users.models import User
from .models import AuditLog, InventoryItem, MAX_INVENTORY_ITEMS


class UserSerializer(serializers.ModelSerializer):
    can_disable = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "is_staff",
            "can_disable",
        ]

    def get_can_disable(self, obj):
        return obj.role != "ADMIN"


class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6, write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_role(self, value):
        if value == "ADMIN":
            raise serializers.ValidationError(
                "Additional admin accounts cannot be created from this screen."
            )
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data.get("last_name", ""),
            email=validated_data.get("email", ""),
            role=validated_data["role"],
            is_active=True,
        )


class AuditLogSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = "__all__"


class InventoryItemSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "sku",
            "category",
            "description",
            "quantity",
            "unit_price",
            "unit",
            "reorder_level",
            "location",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "status"]


class InventoryItemCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = InventoryItem
        fields = [
            "name",
            "sku",
            "category",
            "description",
            "quantity",
            "unit_price",
            "unit",
            "reorder_level",
            "location",
        ]

    def validate(self, attrs):
        if InventoryItem.objects.count() >= MAX_INVENTORY_ITEMS:
            raise serializers.ValidationError(
                f"Inventory limit reached ({MAX_INVENTORY_ITEMS} items). "
                "Remove or update existing stock before adding more."
            )
        return attrs
