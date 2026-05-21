class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        print("CORS middleware initialized")

    def __call__(self, request):
        print(f"CORS middleware called for {request.method} {request.path}")
        response = self.get_response(request)
        
        # Add CORS headers
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        print(f"CORS headers added to response")
        return response