from django.test import SimpleTestCase

from backoffice.serializers import AdminReservationListQuerySerializer


class AdminReservationListQuerySerializerTest(SimpleTestCase):
    def test_pending_reservation_query_defaults_date_range_to_all_dates(self):
        serializer = AdminReservationListQuerySerializer(data={"status": "pending"})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["date_range"], 0)
