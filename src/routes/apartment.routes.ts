import {Router} from 'express';
import { getAllApartments, getApartmentById, addApartmentImages, createApartment, updateApartment } from '../controllers/apartment.controller';


const router = Router();



router.get('/apartments', getAllApartments);

router.get('/apartments/:id', getApartmentById);

router.post('/apartments', createApartment);

router.put('/apartments/:id', updateApartment);
router.post('/apartments/:id/images', addApartmentImages);

export default router;