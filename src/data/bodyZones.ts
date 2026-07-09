export const ZONE = {
  hood: "капот",
  roof: "крыша",
  trunk: "багажник",
  doorFrontRight: "дверь передняя правая",
  doorRearRight: "дверь задняя правая",
  doorFrontLeft: "дверь передняя левая",
  doorRearLeft: "дверь задняя левая",
  body: "кузов",
} as const;

export const ZONE_IDS = Object.values(ZONE);
