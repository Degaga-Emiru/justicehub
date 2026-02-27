from django.utils import timezone

def check_time_overlap(start1, end1, start2, end2):
    """
    Checks if two time ranges overlap.
    Logic: (start_time1 < existing_end_time2) AND (end_time1 > existing_start_time2)
    """
    return (start1 < end2) and (end1 > start2)

def is_within_working_hours(timestamp, duration_minutes):
    """
    Checks if a given time range falls within court working hours.
    Working Hours: Monday - Friday, 08:00 AM - 05:00 PM
    """
    start_time = timestamp
    end_time = start_time + timezone.timedelta(minutes=duration_minutes)
    
    # 0 = Monday, 4 = Friday
    if start_time.weekday() > 4:
        return False, "Hearings can only be scheduled on working days (Monday-Friday)."
        
    start_hour = start_time.hour
    end_hour = end_time.hour
    
    if start_hour < 8 or end_hour >= 17:
        return False, "Hearings must be scheduled between 08:00 AM and 05:00 PM."
        
    return True, ""
