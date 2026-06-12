"""
supabase-py usage examples — one section per table.

Setup:
    pip install supabase

Required env vars:
    SUPABASE_URL      — e.g. https://xyzabc.supabase.co
    SUPABASE_SERVICE_KEY — service role key (bypasses RLS; keep secret)

These examples use the service role key because RLS is disabled and all
access control is enforced in FastAPI. Never expose the service key to
the browser or mobile clients.
"""
from __future__ import annotations

import os
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ═══════════════════════════════════════════════════════════════════════════════
# USERS
# ═══════════════════════════════════════════════════════════════════════════════

def users_examples() -> None:
    # SELECT — fetch a user by RGM
    result = (
        supabase.table("users")
        .select("id, rgm, full_name, role, course, city, is_active, created_at")
        .eq("rgm", "12345678")
        .single()
        .execute()
    )
    user = result.data
    print("User:", user)

    # SELECT — list all active drivers
    result = (
        supabase.table("users")
        .select("id, full_name, role, course, city")
        .eq("role", "DRIVER")
        .eq("is_active", True)
        .order("full_name")
        .execute()
    )
    drivers = result.data
    print("Drivers:", drivers)

    # INSERT — register a new passenger (password_hash produced by FastAPI)
    result = (
        supabase.table("users")
        .insert({
            "rgm":           "87654321",
            "full_name":     "Maria Souza",
            "password_hash": "$2b$12$...",  # bcrypt hash from passlib
            "role":          "PASSENGER",
            "course":        "Engenharia de Software",
            "city":          "Cachoeirinha",
        })
        .execute()
    )
    new_user = result.data[0]
    print("Created user:", new_user["id"])

    # UPDATE — deactivate a user
    supabase.table("users").update({"is_active": False}).eq("rgm", "87654321").execute()

    # DELETE — hard delete (prefer deactivation; use only for GDPR requests)
    supabase.table("users").delete().eq("rgm", "87654321").execute()


# ═══════════════════════════════════════════════════════════════════════════════
# RIDE OFFERS
# ═══════════════════════════════════════════════════════════════════════════════

def ride_offers_examples() -> None:
    # SELECT — all active rides going to CESUCA, with driver info
    result = (
        supabase.table("ride_offers")
        .select("*, users(full_name, course, city)")
        .eq("status", "ACTIVE")
        .eq("trip_type", "GOING_TO_CESUCA")
        .gte("departure_time", "2026-06-10T00:00:00+00:00")
        .order("departure_time")
        .execute()
    )
    rides = result.data
    print("Rides:", rides)

    # INSERT — create a new ride offer
    result = (
        supabase.table("ride_offers")
        .insert({
            "driver_id":           "uuid-of-driver",
            "trip_type":           "GOING_TO_CESUCA",
            "departure_city":      "Porto Alegre",
            "destination":         "Cachoeirinha",
            "departure_time":      "2026-06-15T07:30:00+00:00",
            "available_seats":     3,
            "price_per_passenger": 8.50,
            "vehicle":             "Honda Civic",
            "license_plate":       "ABC-1234",
        })
        .execute()
    )
    new_ride = result.data[0]
    print("Created ride:", new_ride["id"])

    # UPDATE — mark as full
    supabase.table("ride_offers").update({"status": "FULL"}).eq("id", new_ride["id"]).execute()

    # UPDATE — cancel a ride
    supabase.table("ride_offers").update({"status": "CANCELLED"}).eq("id", new_ride["id"]).execute()

    # DELETE — delete a ride (cascades to requests and related notifications)
    supabase.table("ride_offers").delete().eq("id", new_ride["id"]).execute()


# ═══════════════════════════════════════════════════════════════════════════════
# RIDE REQUESTS
# ═══════════════════════════════════════════════════════════════════════════════

def ride_requests_examples() -> None:
    # SELECT — all pending requests for a driver's ride
    result = (
        supabase.table("ride_requests")
        .select("*, users(full_name, rgm, course, city)")
        .eq("ride_id", "uuid-of-ride")
        .eq("status", "PENDING")
        .order("created_at")
        .execute()
    )
    requests = result.data
    print("Pending requests:", requests)

    # SELECT — all rides a passenger has requested
    result = (
        supabase.table("ride_requests")
        .select("*, ride_offers(departure_city, destination, departure_time, trip_type, status)")
        .eq("passenger_id", "uuid-of-passenger")
        .order("created_at", desc=True)
        .execute()
    )
    my_requests = result.data
    print("My requests:", my_requests)

    # INSERT — passenger requests a seat
    result = (
        supabase.table("ride_requests")
        .insert({
            "ride_id":      "uuid-of-ride",
            "passenger_id": "uuid-of-passenger",
            "message":      "Posso pegar na rua tal.",
        })
        .execute()
    )
    new_req = result.data[0]
    print("Created request:", new_req["id"])

    # UPDATE — driver approves the request
    supabase.table("ride_requests").update({"status": "APPROVED"}).eq("id", new_req["id"]).execute()

    # UPDATE — driver rejects the request
    supabase.table("ride_requests").update({"status": "REJECTED"}).eq("id", new_req["id"]).execute()

    # UPDATE — passenger cancels
    supabase.table("ride_requests").update({"status": "CANCELLED"}).eq("id", new_req["id"]).execute()

    # DELETE — remove the request (cascades to related notifications)
    supabase.table("ride_requests").delete().eq("id", new_req["id"]).execute()


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def notifications_examples() -> None:
    # SELECT — unread notifications for a user, newest first
    result = (
        supabase.table("notifications")
        .select("id, title, message, type, is_read, created_at")
        .eq("user_id", "uuid-of-user")
        .eq("is_read", False)
        .order("created_at", desc=True)
        .execute()
    )
    notifs = result.data
    print("Unread notifications:", notifs)

    # SELECT — count unread
    result = (
        supabase.table("notifications")
        .select("id", count="exact")
        .eq("user_id", "uuid-of-user")
        .eq("is_read", False)
        .execute()
    )
    unread_count = result.count
    print("Unread count:", unread_count)

    # INSERT — notify a passenger that their request was approved
    result = (
        supabase.table("notifications")
        .insert({
            "user_id":             "uuid-of-passenger",
            "related_ride_id":     "uuid-of-ride",
            "related_request_id":  "uuid-of-request",
            "title":               "Solicitação aprovada!",
            "message":             "Sua solicitação de carona foi aprovada pelo motorista.",
            "type":                "RIDE_APPROVED",
        })
        .execute()
    )
    print("Notification created:", result.data[0]["id"])

    # UPDATE — mark one notification as read
    supabase.table("notifications").update({"is_read": True}).eq("id", "uuid-of-notif").execute()

    # UPDATE — mark ALL notifications as read for a user
    (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("user_id", "uuid-of-user")
        .eq("is_read", False)
        .execute()
    )

    # DELETE — delete a notification
    supabase.table("notifications").delete().eq("id", "uuid-of-notif").execute()


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════════════

def audit_logs_examples() -> None:
    # INSERT — log a user login event (write-only in normal flow)
    supabase.table("audit_logs").insert({
        "user_id":    "uuid-of-user",
        "action":     "USER_LOGIN",
        "ip_address": "192.168.1.10",
        "user_agent": "Mozilla/5.0 ...",
    }).execute()

    # INSERT — log a ride creation
    supabase.table("audit_logs").insert({
        "user_id":     "uuid-of-driver",
        "action":      "RIDE_CREATED",
        "entity_type": "ride_offer",
        "entity_id":   "uuid-of-ride",
        "details":     {"seats": 3, "trip_type": "GOING_TO_CESUCA"},
    }).execute()

    # SELECT — recent audit logs for admin dashboard (read by admin only)
    result = (
        supabase.table("audit_logs")
        .select("*, users(full_name, rgm)")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    logs = result.data
    print("Recent audit logs:", logs)

    # SELECT — all logins by a specific user
    result = (
        supabase.table("audit_logs")
        .select("action, ip_address, created_at")
        .eq("user_id", "uuid-of-user")
        .eq("action", "USER_LOGIN")
        .order("created_at", desc=True)
        .execute()
    )
    logins = result.data
    print("User logins:", logins)

    # Audit logs are immutable — no UPDATE or DELETE in normal operation.


# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

def system_settings_examples() -> None:
    # INSERT — create a setting (admin only)
    supabase.table("system_settings").insert({
        "key":         "max_seats_per_ride",
        "value":       6,
        "description": "Maximum passengers allowed per ride offer",
    }).execute()

    # SELECT — read a setting by key
    result = (
        supabase.table("system_settings")
        .select("key, value, description")
        .eq("key", "max_seats_per_ride")
        .single()
        .execute()
    )
    setting = result.data
    print("Setting:", setting["key"], "=", setting["value"])

    # SELECT — all settings
    result = supabase.table("system_settings").select("*").order("key").execute()
    all_settings = result.data
    print("All settings:", all_settings)

    # UPDATE — change the value (upsert pattern for idempotency)
    (
        supabase.table("system_settings")
        .upsert({"key": "max_seats_per_ride", "value": 8}, on_conflict="key")
        .execute()
    )

    # DELETE — remove a setting
    supabase.table("system_settings").delete().eq("key", "max_seats_per_ride").execute()


# ── Run all examples ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n=== users ===")
    users_examples()
    print("\n=== ride_offers ===")
    ride_offers_examples()
    print("\n=== ride_requests ===")
    ride_requests_examples()
    print("\n=== notifications ===")
    notifications_examples()
    print("\n=== audit_logs ===")
    audit_logs_examples()
    print("\n=== system_settings ===")
    system_settings_examples()
