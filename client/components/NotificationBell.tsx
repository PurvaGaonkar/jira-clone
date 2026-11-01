
"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Check } from "lucide-react";
import axiosInstance from "@/lib/Axiosinstance";

interface Notification {
  id: string;
  title: string;
  message: string;
  eventType: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const response = await axiosInstance.get(
        "/api/notifications/unread/count"
      );

      setUnreadCount(Number(response.data) || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);

    try {
      const response = await axiosInstance.get("/api/notifications");

      setNotifications(
        Array.isArray(response.data) ? response.data : []
      );

      await fetchUnreadCount();
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      fetchNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axiosInstance.put(`/api/notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );

      await fetchUnreadCount();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosInstance.put("/api/notifications/read-all");

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleNotifications}
        className="relative rounded-md p-2 text-[#42526E] hover:bg-[#EBECF0]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute bottom-10 right-0 z-50 w-80 max-w-[85vw] rounded-lg border border-[#DFE1E6] bg-white shadow-xl">

            <div className="flex items-center justify-between border-b p-3">
              <div>
                <h3 className="font-semibold text-[#172B4D]">
                  Notifications
                </h3>

                <p className="text-xs text-[#6B778C]">
                  {unreadCount} unread
                </p>
              </div>

              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 text-xs text-[#0052CC] disabled:opacity-40"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">

              {loading ? (
                <p className="p-6 text-center text-sm text-[#6B778C]">
                  Loading notifications...
                </p>
              ) : notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-[#6B778C]">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b p-3 ${
                      notification.read ? "bg-white" : "bg-[#F0F5FF]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#172B4D]">
                          {notification.title}
                        </p>

                        <p className="mt-1 break-words text-xs text-[#42526E]">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-[10px] text-[#8993A4]">
                          {notification.createdAt
                            ? new Date(
                                notification.createdAt
                              ).toLocaleString()
                            : ""}
                        </p>
                      </div>

                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          title="Mark as read"
                          className="rounded p-1 text-[#0052CC] hover:bg-[#DEEBFF]"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
