from rest_framework import serializers


class AdminUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    nickname = serializers.CharField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    status = serializers.CharField(required=True)
    joined_at = serializers.DateField(required=True)
    team_ids = serializers.ListField(child=serializers.IntegerField(), required=True)


class AdminUserListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True)
    team_id = serializers.IntegerField(required=False, min_value=1)
    status = serializers.ChoiceField(
        required=False,
        choices=["all", "normal", "blocked"],
        default="all",
    )
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, default=30)


class AdminTeamListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True)
    leader_id = serializers.IntegerField(required=False, min_value=0)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, default=30)


class AdminTeamSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    name = serializers.CharField(required=True)
    color_id = serializers.IntegerField(required=False, allow_null=True)
    color_value = serializers.CharField(required=True, allow_null=True)
    leader_id = serializers.IntegerField(required=True)
    leader_nickname = serializers.CharField(required=False, allow_null=True)
    member_count = serializers.IntegerField(required=True)
    updated_at = serializers.DateField(required=True)


class AdminTeamMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    nickname = serializers.CharField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    status = serializers.CharField(required=True)
    is_leader = serializers.BooleanField(required=True)


class AdminTeamDetailSerializer(AdminTeamSerializer):
    member_ids = serializers.ListField(child=serializers.IntegerField(), required=True)
    members = AdminTeamMemberSerializer(many=True, required=True)


class AdminTeamCreateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, max_length=50)
    color_id = serializers.IntegerField(required=True, min_value=1)
    leader_id = serializers.IntegerField(required=True, min_value=0)

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("팀 이름은 비워둘 수 없습니다.")
        return name


class AdminTeamUpdateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=50)
    color_id = serializers.IntegerField(required=False, min_value=1)

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("팀 이름은 비워둘 수 없습니다.")
        return name

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("변경할 값을 입력해주세요.")
        return attrs


class AdminTeamMemberAddRequestSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        required=True,
    )


class AdminTeamLeaderRequestSerializer(serializers.Serializer):
    leader_id = serializers.IntegerField(required=True, min_value=0)


class AdminTeamColorQuerySerializer(serializers.Serializer):
    team_id = serializers.IntegerField(required=False, min_value=1)


class AdminTeamColorSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    name = serializers.CharField(required=True)
    value = serializers.CharField(required=True)
    available = serializers.BooleanField(required=True)


class AdminRoomSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    name = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_null=True)
    open_time = serializers.TimeField(required=True)
    close_time = serializers.TimeField(required=True)
    is_open_all_day = serializers.BooleanField(required=True)
    is_active = serializers.BooleanField(required=True)
    sort_order = serializers.IntegerField(required=True)
    updated_at = serializers.DateField(required=True)


class AdminRoomListQuerySerializer(serializers.Serializer):
    include_inactive = serializers.BooleanField(required=False, default=False)


class AdminRoomRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, max_length=30)
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
    )
    open_time = serializers.TimeField(required=True)
    close_time = serializers.TimeField(required=True)
    is_open_all_day = serializers.BooleanField(required=True)

    def validate_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("합주실 이름은 비워둘 수 없습니다.")
        return name


class AdminReservationSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    status = serializers.CharField(required=True)
    kind = serializers.CharField(required=True)
    room_id = serializers.IntegerField(required=True)
    room_name = serializers.CharField(required=True)
    date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    end_next_day = serializers.BooleanField(required=True)
    team_id = serializers.IntegerField(required=False, allow_null=True)
    team_name = serializers.CharField(required=False, allow_null=True)
    reserver_user_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(required=True)
    reserver_name = serializers.CharField(required=True)
    memo = serializers.CharField(required=False, allow_blank=True)
    repeat_weekdays = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    repeat_start_date = serializers.DateField(required=False, allow_null=True)
    repeat_end_date = serializers.DateField(required=False, allow_null=True)
    canceled_occurrence_dates = serializers.ListField(
        child=serializers.DateField(), required=False
    )


class AdminReservationCreateRequestSerializer(serializers.Serializer):
    date = serializers.DateField(required=True, format="%Y-%m-%d")
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    end_next_day = serializers.BooleanField(required=False, default=False)
    room_id = serializers.IntegerField(required=True, min_value=1)
    team_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    title = serializers.CharField(required=False, allow_blank=True, max_length=100)
    memo = serializers.CharField(required=False, allow_blank=True)
    force_cancel_conflict_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )


class AdminReservationListQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(required=True, choices=["pending", "approved"])
    date_range = serializers.IntegerField(required=False, min_value=1, default=7)
    team_type = serializers.ChoiceField(
        required=False,
        choices=["all", "team", "private"],
        default="all",
    )
    room_id = serializers.IntegerField(required=False, min_value=1)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, default=20)


class AdminReservationConflictQuerySerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=True, min_value=1)
    date = serializers.DateField(required=True, format="%Y-%m-%d")
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    end_next_day = serializers.BooleanField(required=False, default=False)
    exclude_id = serializers.IntegerField(required=False, min_value=1)


class AdminReservationConflictSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    room_id = serializers.IntegerField(required=False)
    room_name = serializers.CharField(required=True)
    date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=True)
    end_time = serializers.TimeField(required=True)
    end_next_day = serializers.BooleanField(required=True)
    owner_label = serializers.CharField(required=True)
    status = serializers.CharField(required=True)


class AdminReservationCancelOccurrencesRequestSerializer(serializers.Serializer):
    dates = serializers.ListField(
        child=serializers.DateField(format="%Y-%m-%d"),
        allow_empty=False,
        required=True,
    )


class AdminReservationCancelOccurrencesSerializer(serializers.Serializer):
    canceled_occurrence_dates = serializers.ListField(
        child=serializers.DateField(format="%Y-%m-%d"),
        required=True,
    )


class AdminDayOffSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    room_id = serializers.IntegerField(required=False, allow_null=True)
    room_name = serializers.CharField(required=True)
    type = serializers.CharField(required=True)
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    start_time = serializers.TimeField(required=False, allow_null=True)
    end_time = serializers.TimeField(required=False, allow_null=True)
    is_all_day = serializers.BooleanField(required=True)
    reason = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(required=True)


class AdminDayOffListQuerySerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=False, min_value=1)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, default=30)


class AdminDayOffRequestSerializer(serializers.Serializer):
    room_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    type = serializers.ChoiceField(required=True, choices=["점검", "휴무", "기타"])
    start_date = serializers.DateField(required=True, format="%Y-%m-%d")
    end_date = serializers.DateField(required=True, format="%Y-%m-%d")
    start_time = serializers.TimeField(required=False, allow_null=True)
    end_time = serializers.TimeField(required=False, allow_null=True)
    is_all_day = serializers.BooleanField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    force_cancel_reservation_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )


class AdminLogQuerySerializer(serializers.Serializer):
    category = serializers.ChoiceField(
        required=False,
        choices=["예약", "사용자", "팀", "합주실", "쉬는날"],
    )
    created_after = serializers.DateTimeField(required=False)
    cursor = serializers.CharField(required=False)
    page_size = serializers.IntegerField(
        required=False, min_value=1, max_value=100, default=30
    )


class AdminLogSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)
    category = serializers.CharField(required=True)
    action = serializers.CharField(required=True)
    target = serializers.CharField(required=True)
    detail = serializers.CharField(required=True)
    created_at = serializers.DateTimeField(required=True)
