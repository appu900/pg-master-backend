
-- KEYS[1] = otp key (otp:phone)
-- KEYS[2] = stream name
-- ARGV[1] = otp
-- ARGV[2] = ttl
-- ARGV[3] = phone

if redis.call("EXISTS", KEYS[1]) == 1 then
  return { err = "OTP_ALREADY_EXISTS" }
end

redis.call(
  "SET",
  KEYS[1],
  cjson.encode({ otp = ARGV[1], attempts = 0 }),
  "EX",
  ARGV[2]
)

redis.call(
  "XADD",
  KEYS[2],
  "*",
  "phone", ARGV[3],
  "otp", ARGV[1]
)

return "OK"



