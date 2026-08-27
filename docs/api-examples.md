# API Examples

## Create a public ticket

```bash
curl -X POST http://localhost:4000/api/v1/public/tickets \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"Alice Customer","customerEmail":"alice@example.com","subject":"Payment failed","description":"My payment failed but the amount was deducted."}'
```

## Look up tickets

```bash
curl -X POST http://localhost:4000/api/v1/public/tickets/lookup \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","page":1,"limit":10}'
```

## Reply as a customer

```bash
curl -X POST http://localhost:4000/api/v1/public/tickets/TKT-1001/replies \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","message":"The transaction reference is TX-42."}'
```

## Log in as staff

```bash
curl -c cookies.txt -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@pente.ai","password":"PenteDemo123!"}'
```

Copy `accessToken` from the response into `ACCESS_TOKEN` for protected examples.

## Filter tickets

```bash
curl 'http://localhost:4000/api/v1/tickets?page=1&limit=20&status=Open&priority=High' \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Change status

```bash
curl -X PATCH http://localhost:4000/api/v1/tickets/TKT-1001/status \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"In Progress"}'
```

## Generate a conversation summary

```bash
curl -X POST http://localhost:4000/api/v1/tickets/TKT-1001/ai/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Confirm an AI triage recommendation

```bash
curl -X POST http://localhost:4000/api/v1/tickets/TKT-1001/ai/triage/review \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"accepted":true}'
```

## Refresh a session

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:4000/api/v1/auth/refresh
```

## Read the cached overview

```bash
curl http://localhost:5001/reports/overview \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Preview an external webhook

```bash
curl -X POST http://localhost:5001/reports/webhook-preview \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"externalId":"external-123","customer":{"name":"Alice Customer","email":"alice@example.com"},"subject":"Account access failed","description":"The customer cannot access their paid account.","urgency":"high"}'
```
