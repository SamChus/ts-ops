import { Router } from "express";
import { createBooking } from "../controllers/booking.controller";


const route = Router()


route.post('/:id', createBooking);

route.get('/bookings/:id/', (req, res) => {
    res.json({ message: `Details of booking ${req.params.id}` });
});

route.put('/bookings/:id', (req, res) => {
    res.json({ message: `Booking ${req.params.id} updated` });
});

route.delete('/bookings/:id', (req, res) => {
    res.json({ message: `Booking ${req.params.id} deleted` });
});

route.get('/bookings', (req, res) => {
    res.json({ message: 'List of bookings' });
});


export default route

