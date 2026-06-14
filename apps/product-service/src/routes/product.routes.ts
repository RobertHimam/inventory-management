import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { ProductService } from '../services/ProductService';
import { ProductRepository } from '../repositories/ProductRepository';

const router = Router();

// Initialize dependencies
const productRepository = new ProductRepository();
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

// POST /products - Create a new product
router.post('/', productController.createProduct.bind(productController));

export default router;
