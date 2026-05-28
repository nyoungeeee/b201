from django.contrib import admin

from teams.models import Team, TeamColor, TeamMember


@admin.register(TeamColor)
class TeamColorAdmin(admin.ModelAdmin):
    list_display = ("color", "team", "is_active", "display_order")
    list_filter = ("is_active",)
    ordering = ("display_order", "id")


admin.site.register(Team)
admin.site.register(TeamMember)
