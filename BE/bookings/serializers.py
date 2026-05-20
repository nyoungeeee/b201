from rest_framework import serializers

from bookings.models import BookingStatus


class SlotSerializer(serializers.Serializer):
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    name = serializers.CharField(required=True)
    memo = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=True)
    status = serializers.CharField(required=False, allow_null=True)


class DayBookingCheckSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    date = serializers.DateField(required=True)
    open_time = serializers.TimeField(required=True)
    close_time = serializers.TimeField(required=True)
    status = serializers.CharField(required=True)
    slot = SlotSerializer(many=True, required=True)


class DayBookingQueryParamsSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, format="%Y-%m-%d")


class MonthDateColorSerializer(serializers.Serializer):
    date = serializers.DateField(required=True)
    color = serializers.ListField(child=serializers.CharField())
    disabled = serializers.BooleanField(required=True)


class MonthBookingSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    year = serializers.IntegerField(required=True)
    month = serializers.IntegerField(required=True)
    days = MonthDateColorSerializer(many=True, required=True)


class MonthBookingQueryParamsSerializer(serializers.Serializer):
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)
    year = serializers.IntegerField(required=False, min_value=1)


class ReservationStatusField(serializers.ChoiceField):
    def __init__(self, **kwargs):
        super().__init__(choices=BookingStatus.choices, **kwargs)


class ReservationStatusListField(serializers.ListField):
    child = ReservationStatusField()

    def to_internal_value(self, data):
        if isinstance(data, str):
            data = [data]
        return super().to_internal_value(data)


class ReservationItemSerializer(serializers.Serializer):
    reservation_number = serializers.IntegerField(required=True)
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    type = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    memo = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=True)
    status = serializers.CharField(required=True)


class TeamReservationItemSerializer(ReservationItemSerializer):
    team_id = serializers.IntegerField(required=True)
    team_name = serializers.CharField(required=True)


class MyReservationListSerializer(serializers.Serializer):
    reservations = ReservationItemSerializer(many=True, required=True)


class TeamReservationListSerializer(serializers.Serializer):
    reservations = TeamReservationItemSerializer(many=True, required=True)


class ReservationListQueryParamsSerializer(serializers.Serializer):
    date = serializers.DateField(required=False, format="%Y-%m-%d")
    status = ReservationStatusListField(required=False)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    size = serializers.IntegerField(required=False, min_value=1, default=20)


class TeamReservationListQueryParamsSerializer(ReservationListQueryParamsSerializer):
    team_id = serializers.IntegerField(required=False, min_value=1)


class PrivateReservationCreateRequestSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=True, format="%Y-%m-%d")
    count = serializers.IntegerField(required=False, min_value=1, default=1)
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)


class TeamReservationCreateRequestSerializer(PrivateReservationCreateRequestSerializer):
    team_id = serializers.IntegerField(required=True, min_value=1)


class RepeatOccurrenceSerializer(serializers.Serializer):
    week = serializers.IntegerField(required=True)
    date = serializers.DateField(required=True)


class RepeatConflictOccurrenceSerializer(serializers.Serializer):
    week = serializers.IntegerField(required=True)
    date = serializers.DateField(required=True)
    code = serializers.CharField(required=True)
    message = serializers.CharField(required=True)


class RepeatReservationCheckResponseSerializer(serializers.Serializer):
    available_occurrences = RepeatOccurrenceSerializer(many=True, required=True)
    conflict_occurrences = RepeatConflictOccurrenceSerializer(many=True, required=True)


class PrivateReservationCreateResponseSerializer(serializers.Serializer):
    reservations = ReservationItemSerializer(many=True, required=True)
    skipped_occurrences = RepeatConflictOccurrenceSerializer(many=True, required=False)


class TeamReservationCreateResponseSerializer(serializers.Serializer):
    reservations = TeamReservationItemSerializer(many=True, required=True)
    skipped_occurrences = RepeatConflictOccurrenceSerializer(many=True, required=False)
