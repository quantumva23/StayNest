import { Router } from 'express';
import { getCities } from '../properties/properties.controller';

const router = Router();

router.get('/', getCities);

export default router;
