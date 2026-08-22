from django.test import SimpleTestCase

from backoffice.serializers import AdminReservationListQuerySerializer


class AdminReservationListQuerySerializerTest(SimpleTestCase):
    def test_pending_reservation_query_defaults_date_range_to_all_dates(self):
        serializer = AdminReservationListQuerySerializer(data={"status": "pending"})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["date_range"], 0)

    def test_reservation_query_accepts_user_and_team_filters(self):
        serializer = AdminReservationListQuerySerializer(
            data={"status": "approved", "user_id": 12, "team_id": 34}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["user_id"], 12)
        self.assertEqual(serializer.validated_data["team_id"], 34)

    def test_reservation_query_accepts_all_status_for_history(self):
        serializer = AdminReservationListQuerySerializer(data={"status": "all"})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["status"], "all")
