from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer


@api_view(['GET', 'POST', 'OPTIONS'])
def login_view(request):

    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Allow-Credentials'] = 'true'
        return response

    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        account = User.objects.get(username__iexact=username)
        if not account.is_active:
            return Response(
                {
                    "error": (
                        f"Account '{account.username}' is inactive. "
                        "Ask an administrator to enable it, or sign in as admin."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )
    except User.DoesNotExist:
        account = None

    user = authenticate(username=account.username if account else username, password=password)

    if user is not None:

        refresh = RefreshToken.for_user(user)

        response = Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data
        })
        
        # Add CORS headers manually
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        return response

    response = Response(
        {"error": "Invalid Credentials"},
        status=status.HTTP_401_UNAUTHORIZED
    )
    
    # Add CORS headers to error response too
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response['Access-Control-Allow-Credentials'] = 'true'
    
    return response
