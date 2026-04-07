from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
# ✅ Import spectacular views
from drf_spectacular.views import (
    SpectacularAPIView, 
    SpectacularSwaggerView, 
    SpectacularRedocView
)

urlpatterns = [
    # 1. Schema Generation (The "Brain" of the docs)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    
    # 2. Interactive Documentation UIs
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # 3. Admin and App APIs
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/cases/', include('cases.urls')),
    path('api/hearings/', include('hearings.urls')),
    path('api/decisions/', include('decisions.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/audit/', include('audit_logs.urls')),
    path('api/payments/', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)