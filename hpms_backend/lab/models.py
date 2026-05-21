"""
Lab orders live on doctor.models.LabOrder (created via /api/doctor/lab-order/).
This app only exposes lab staff API views to avoid a second LabOrder on Visit.
"""

from django.db import models  # noqa: F401 — keeps Django app structure
