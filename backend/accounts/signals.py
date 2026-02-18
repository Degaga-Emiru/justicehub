from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.core.management import call_command

@receiver(post_migrate)
def create_initial_admin(sender, **kwargs):
    """
    Create initial admin after migrations if no admin exists.
    """
    if sender.name == 'accounts':
        call_command('create_initial_admin')