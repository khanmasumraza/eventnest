# MERN Backend Debugging TODO

## Current Task: Razorpay Ticket Debug Logs (2024)

### Steps to Complete:

- [ ] 1. Add console logs to paymentController.verifyPayment (registrationData, create result)
- [ ] 2. Add/enhance console logs to ticketController.getTicket (params, query result)
- [ ] 3. Restart backend server (cd backend &amp;&amp; npm start)
- [ ] 4. Trigger test Razorpay payment success
- [ ] 5. Copy backend console logs after payment + /ticket/:id access
- [ ] 6. MongoDB check: db.registrations.find({ticketId: "EVT-xxx"})
- [ ] 7. Analyze: ticket saved? ticketId match? query null why?

### Next After Logs:

- Fix root cause (model/index/payment sync/etc.)

Updated: $(date)
