const FAVORITE_USER_KEY = "turobus_favorite_user_key";

export function getFavoriteUserKey() {
  if (typeof window === "undefined") {
    return "";
  }

  let userKey = window.localStorage.getItem(FAVORITE_USER_KEY);

  if (!userKey) {
    userKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    window.localStorage.setItem(FAVORITE_USER_KEY, userKey);
  }

  return userKey;
}
