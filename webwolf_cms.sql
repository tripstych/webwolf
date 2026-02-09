-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: webwolf_cms
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `addresses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `type` enum('billing','shipping') NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `address1` varchar(255) NOT NULL,
  `address2` varchar(255) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) NOT NULL,
  `country` varchar(2) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (1,1,'shipping','John','Anderson',NULL,'123 Main St',NULL,'New York','NY','10001','US',NULL,1,'2026-02-09 13:14:28'),(2,2,'shipping','Sarah','Martinez',NULL,'456 Oak Ave',NULL,'Los Angeles','CA','90001','US',NULL,1,'2026-02-09 13:14:28'),(3,3,'shipping','Michael','Chen',NULL,'789 Pine Rd',NULL,'San Francisco','CA','94101','US',NULL,1,'2026-02-09 13:14:28');
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blocks`
--

DROP TABLE IF EXISTS `blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `content_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `content_type` varchar(50) DEFAULT 'blocks',
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `template_id` (`template_id`),
  KEY `content_id` (`content_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_content_type` (`content_type`),
  CONSTRAINT `blocks_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `blocks_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL,
  CONSTRAINT `blocks_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `blocks_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocks`
--

LOCK TABLES `blocks` WRITE;
/*!40000 ALTER TABLE `blocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content`
--

DROP TABLE IF EXISTS `content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `module` varchar(50) NOT NULL,
  `data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `title` varchar(255) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_type` (`module`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content`
--

LOCK TABLES `content` WRITE;
/*!40000 ALTER TABLE `content` DISABLE KEYS */;
INSERT INTO `content` VALUES (1,'pages','{\"hero_title\":\"Welcome to Modern Apparel\",\"hero_subtitle\":\"Discover premium clothing and lifestyle products\",\"hero_cta_text\":\"Shop Now\",\"hero_cta_link\":\"/products\",\"intro_content\":\"<p>We curate the finest selection of modern apparel for the contemporary lifestyle. From everyday essentials to statement pieces.</p>\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','Home','/'),(2,'pages','{\"page_content\":\"<h2>About Modern Apparel</h2><p>Since 2020, we\'ve been dedicated to bringing you the finest quality clothing and lifestyle products. Our curated selection focuses on sustainable materials, timeless designs, and exceptional comfort.</p><p>Every piece in our collection is carefully selected to meet our high standards for quality and style.</p>\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','About Us','/about'),(3,'products','{\"description\":\"Timeless crew neck t-shirt in premium cotton. Perfect for any wardrobe.\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','Classic Crew Neck T-Shirt','/products/classic-crew-neck-tshirt'),(4,'products','{\"description\":\"Classic fit denim with modern comfort. Built to last.\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','Premium Denim Jeans','/products/premium-denim-jeans'),(5,'products','{\"description\":\"Premium leather jacket with timeless style.\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','Leather Jacket','/products/leather-jacket'),(6,'products','{\"description\":\"Soft and cozy hoodie, perfect for layering.\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','Comfort Hoodie','/products/comfort-hoodie'),(7,'products','{\"description\":\"Clean white leather sneakers with premium comfort.\"}','2026-02-09 13:14:27','2026-02-09 13:14:27','White Leather Sneakers','/products/white-leather-sneakers'),(8,'blog','{\"excerpt\":\"Discover how to build a timeless wardrobe with fewer pieces.\",\"content\":\"<p>Minimalist fashion is about quality over quantity. Focus on neutral colors, classic silhouettes, and versatile pieces that work together...</p>\",\"author\":\"Modern Apparel Team\"}','2026-02-09 13:14:28','2026-02-09 13:14:28','The Art of Minimalist Fashion','/blog/minimalist-fashion'),(9,'blog','{\"excerpt\":\"Learn about sustainable fashion and how to make better choices.\",\"content\":\"<p>Sustainable fashion is becoming increasingly important. By choosing quality pieces that last, you reduce waste and support ethical brands...</p>\",\"author\":\"Modern Apparel Team\"}','2026-02-09 13:14:28','2026-02-09 13:14:28','Sustainable Style: Making Ethical Choices','/blog/sustainable-style');
/*!40000 ALTER TABLE `content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_groups`
--

DROP TABLE IF EXISTS `content_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `content_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `content_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_content` (`group_id`,`content_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_content_id` (`content_id`),
  CONSTRAINT `content_groups_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_groups_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_groups`
--

LOCK TABLES `content_groups` WRITE;
/*!40000 ALTER TABLE `content_groups` DISABLE KEYS */;
INSERT INTO `content_groups` VALUES (1,1,1,'2026-02-09 13:14:28'),(2,1,4,'2026-02-09 13:14:28');
/*!40000 ALTER TABLE `content_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_type_extensions`
--

DROP TABLE IF EXISTS `content_type_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `content_type_extensions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_type_name` varchar(50) NOT NULL,
  `extension_name` varchar(50) NOT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `enabled` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_type_extension` (`content_type_name`,`extension_name`),
  CONSTRAINT `content_type_extensions_ibfk_1` FOREIGN KEY (`content_type_name`) REFERENCES `content_types` (`name`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_type_extensions`
--

LOCK TABLES `content_type_extensions` WRITE;
/*!40000 ALTER TABLE `content_type_extensions` DISABLE KEYS */;
/*!40000 ALTER TABLE `content_type_extensions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_types`
--

DROP TABLE IF EXISTS `content_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `content_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `plural_label` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT 'FileText',
  `color` varchar(20) DEFAULT 'gray',
  `menu_order` int(11) DEFAULT 999,
  `show_in_menu` tinyint(1) DEFAULT 1,
  `has_status` tinyint(1) DEFAULT 1,
  `has_seo` tinyint(1) DEFAULT 1,
  `is_system` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_types`
--

LOCK TABLES `content_types` WRITE;
/*!40000 ALTER TABLE `content_types` DISABLE KEYS */;
INSERT INTO `content_types` VALUES (1,'pages','Page','Pages','FileText','gray',1,1,1,1,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(2,'blocks','Block','Blocks','Boxes','gray',2,1,0,0,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(3,'products','Product','Products','ShoppingCart','gray',3,1,1,1,0,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(4,'blog','Blog Post','Blog Posts','BookOpen','gray',4,1,1,1,0,'2026-02-09 13:14:27','2026-02-09 13:14:27');
/*!40000 ALTER TABLE `content_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password` varchar(255) DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `oauth_provider` varchar(50) DEFAULT NULL,
  `oauth_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `user_id` (`user_id`),
  KEY `idx_email` (`email`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,NULL,'john@example.com','John','Anderson','555-0101','2026-02-09 13:14:28','2026-02-09 13:14:28',NULL,0,NULL,NULL,NULL,NULL,NULL),(2,NULL,'sarah@example.com','Sarah','Martinez','555-0102','2026-02-09 13:14:28','2026-02-09 13:14:28',NULL,0,NULL,NULL,NULL,NULL,NULL),(3,NULL,'michael@example.com','Michael','Chen','555-0103','2026-02-09 13:14:28','2026-02-09 13:14:28',NULL,0,NULL,NULL,NULL,NULL,NULL),(4,NULL,'emma@example.com','Emma','Wilson','555-0104','2026-02-09 13:14:28','2026-02-09 13:14:28',NULL,0,NULL,NULL,NULL,NULL,NULL),(5,NULL,'david@example.com','David','Taylor','555-0105','2026-02-09 13:14:28','2026-02-09 13:14:28',NULL,0,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `groups`
--

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
INSERT INTO `groups` VALUES (1,NULL,'Featured Products','2026-02-09 13:14:28','2026-02-09 13:14:28');
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media`
--

DROP TABLE IF EXISTS `media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size` int(11) NOT NULL,
  `path` varchar(500) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `media_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media`
--

LOCK TABLES `media` WRITE;
/*!40000 ALTER TABLE `media` DISABLE KEYS */;
/*!40000 ALTER TABLE `media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `url` varchar(500) DEFAULT NULL,
  `page_id` int(11) DEFAULT NULL,
  `target` enum('_self','_blank') DEFAULT '_self',
  `position` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `menu_id` (`menu_id`),
  KEY `parent_id` (`parent_id`),
  KEY `page_id` (`page_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE,
  CONSTRAINT `menu_items_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `menu_items_ibfk_3` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,1,NULL,'Home','/',NULL,'_self',1,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(2,1,NULL,'Shop','/products',NULL,'_self',2,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(3,1,NULL,'About','/about',NULL,'_self',3,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(4,1,NULL,'Blog','/blog',NULL,'_self',4,'2026-02-09 13:14:28','2026-02-09 13:14:28');
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menus`
--

DROP TABLE IF EXISTS `menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `menus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menus`
--

LOCK TABLES `menus` WRITE;
/*!40000 ALTER TABLE `menus` DISABLE KEYS */;
INSERT INTO `menus` VALUES (1,'Main Navigation','main-nav',NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28');
/*!40000 ALTER TABLE `menus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `product_title` varchar(255) NOT NULL,
  `variant_title` varchar(255) DEFAULT NULL,
  `sku` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `variant_id` (`variant_id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,1,1,'Classic Crew Neck T-Shirt',NULL,'CLASSIC-TEE-M',39.99,2,79.98,'2026-02-09 13:14:28'),(2,2,2,7,'Premium Denim Jeans',NULL,'DENIM-BLUE-32',89.99,1,89.99,'2026-02-09 13:14:28'),(3,3,3,13,'Leather Jacket',NULL,'LEATHER-JACKET-L',199.99,1,199.99,'2026-02-09 13:14:28'),(4,3,1,2,'Classic Crew Neck T-Shirt',NULL,'CLASSIC-TEE-L',39.99,1,39.99,'2026-02-09 13:14:28'),(5,4,4,17,'Comfort Hoodie',NULL,'HOODIE-Black-M',59.99,2,119.98,'2026-02-09 13:14:28');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `status` enum('pending','processing','shipped','completed','cancelled','refunded') DEFAULT 'pending',
  `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending',
  `subtotal` decimal(10,2) NOT NULL,
  `tax` decimal(10,2) DEFAULT 0.00,
  `shipping` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `email` varchar(255) NOT NULL,
  `billing_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`billing_address`)),
  `shipping_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`shipping_address`)),
  `payment_method` enum('stripe','paypal','cod') NOT NULL,
  `payment_intent_id` varchar(255) DEFAULT NULL,
  `paypal_order_id` varchar(255) DEFAULT NULL,
  `shipping_method` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(255) DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `customer_note` text DEFAULT NULL,
  `internal_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_status` (`payment_status`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'#1258',1,'completed','paid',129.98,10.40,9.99,0.00,150.37,'john@example.com','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','stripe',NULL,NULL,'Standard',NULL,NULL,NULL,NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(2,'#1779',2,'processing','paid',89.99,7.20,9.99,0.00,107.18,'sarah@example.com','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','paypal',NULL,NULL,'Standard',NULL,NULL,NULL,NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(3,'#1215',3,'shipped','paid',259.97,20.80,9.99,0.00,290.76,'michael@example.com','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','stripe',NULL,NULL,'Express','TRK123456789',NULL,NULL,NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(4,'#1801',4,'pending','pending',119.98,9.60,0.00,0.00,129.58,'emma@example.com','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','{\"first_name\":\"John\",\"last_name\":\"Doe\",\"address1\":\"123 Main St\",\"city\":\"New York\",\"province\":\"NY\",\"postal_code\":\"10001\",\"country\":\"US\"}','stripe',NULL,NULL,'Standard',NULL,NULL,NULL,NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `content_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content_type` varchar(50) DEFAULT 'pages',
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `og_title` varchar(255) DEFAULT NULL,
  `og_description` text DEFAULT NULL,
  `og_image` varchar(500) DEFAULT NULL,
  `canonical_url` varchar(500) DEFAULT NULL,
  `robots` varchar(100) DEFAULT 'index, follow',
  `schema_markup` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`schema_markup`)),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `template_id` (`template_id`),
  KEY `content_id` (`content_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_content_type` (`content_type`),
  CONSTRAINT `pages_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `pages_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pages_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `pages_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pages`
--

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES (1,1,1,'Home','/','pages','published',NULL,'Modern Apparel - Premium Clothing','Discover our curated collection of premium apparel and lifestyle products',NULL,NULL,NULL,NULL,'index, follow',NULL,1,NULL,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(2,2,2,'About Us','/about','pages','published',NULL,'About Modern Apparel','Learn about our mission and values',NULL,NULL,NULL,NULL,'index, follow',NULL,1,NULL,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(3,4,8,'The Art of Minimalist Fashion','/blog/minimalist-fashion','pages','published',NULL,'The Art of Minimalist Fashion','Discover how to build a timeless wardrobe with fewer pieces.',NULL,NULL,NULL,NULL,'index, follow',NULL,1,NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28'),(4,4,9,'Sustainable Style: Making Ethical Choices','/blog/sustainable-style','pages','published',NULL,'Sustainable Style: Making Ethical Choices','Learn about sustainable fashion and how to make better choices.',NULL,NULL,NULL,NULL,'index, follow',NULL,1,NULL,'2026-02-09 13:14:28','2026-02-09 13:14:28');
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_variants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `inventory_quantity` int(11) DEFAULT 0,
  `option1_name` varchar(50) DEFAULT NULL,
  `option1_value` varchar(100) DEFAULT NULL,
  `option2_name` varchar(50) DEFAULT NULL,
  `option2_value` varchar(100) DEFAULT NULL,
  `option3_name` varchar(50) DEFAULT NULL,
  `option3_value` varchar(100) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `position` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (1,1,'Classic Tee - XS','CLASSIC-TEE-XS',39.99,NULL,20,'Size','XS',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(2,1,'Classic Tee - S','CLASSIC-TEE-S',39.99,NULL,20,'Size','S',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(3,1,'Classic Tee - M','CLASSIC-TEE-M',39.99,NULL,20,'Size','M',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(4,1,'Classic Tee - L','CLASSIC-TEE-L',39.99,NULL,20,'Size','L',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(5,1,'Classic Tee - XL','CLASSIC-TEE-XL',39.99,NULL,20,'Size','XL',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(6,1,'Classic Tee - XXL','CLASSIC-TEE-XXL',39.99,NULL,20,'Size','XXL',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(7,2,'Premium Denim - 28','DENIM-BLUE-28',89.99,NULL,15,'Size','28',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(8,2,'Premium Denim - 30','DENIM-BLUE-30',89.99,NULL,15,'Size','30',NULL,NULL,NULL,NULL,NULL,2,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(9,2,'Premium Denim - 32','DENIM-BLUE-32',89.99,NULL,15,'Size','32',NULL,NULL,NULL,NULL,NULL,3,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(10,2,'Premium Denim - 34','DENIM-BLUE-34',89.99,NULL,15,'Size','34',NULL,NULL,NULL,NULL,NULL,4,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(11,2,'Premium Denim - 36','DENIM-BLUE-36',89.99,NULL,15,'Size','36',NULL,NULL,NULL,NULL,NULL,5,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(12,2,'Premium Denim - 38','DENIM-BLUE-38',89.99,NULL,15,'Size','38',NULL,NULL,NULL,NULL,NULL,6,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(13,3,'Leather Jacket - XS','LEATHER-JACKET-XS',199.99,NULL,10,'Size','XS',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(14,3,'Leather Jacket - S','LEATHER-JACKET-S',199.99,NULL,10,'Size','S',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(15,3,'Leather Jacket - M','LEATHER-JACKET-M',199.99,NULL,10,'Size','M',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(16,3,'Leather Jacket - L','LEATHER-JACKET-L',199.99,NULL,10,'Size','L',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(17,3,'Leather Jacket - XL','LEATHER-JACKET-XL',199.99,NULL,10,'Size','XL',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(18,4,'Gray Hoodie - S','HOODIE-Gray-S',59.99,NULL,12,'Color','Gray','Size','S',NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(19,4,'Gray Hoodie - M','HOODIE-Gray-M',59.99,NULL,12,'Color','Gray','Size','M',NULL,NULL,NULL,2,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(20,4,'Gray Hoodie - L','HOODIE-Gray-L',59.99,NULL,12,'Color','Gray','Size','L',NULL,NULL,NULL,3,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(21,4,'Gray Hoodie - XL','HOODIE-Gray-XL',59.99,NULL,12,'Color','Gray','Size','XL',NULL,NULL,NULL,4,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(22,4,'Black Hoodie - S','HOODIE-Black-S',59.99,NULL,12,'Color','Black','Size','S',NULL,NULL,NULL,5,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(23,4,'Black Hoodie - M','HOODIE-Black-M',59.99,NULL,12,'Color','Black','Size','M',NULL,NULL,NULL,6,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(24,4,'Black Hoodie - L','HOODIE-Black-L',59.99,NULL,12,'Color','Black','Size','L',NULL,NULL,NULL,7,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(25,4,'Black Hoodie - XL','HOODIE-Black-XL',59.99,NULL,12,'Color','Black','Size','XL',NULL,NULL,NULL,8,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(26,4,'Navy Hoodie - S','HOODIE-Navy-S',59.99,NULL,12,'Color','Navy','Size','S',NULL,NULL,NULL,9,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(27,4,'Navy Hoodie - M','HOODIE-Navy-M',59.99,NULL,12,'Color','Navy','Size','M',NULL,NULL,NULL,10,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(28,4,'Navy Hoodie - L','HOODIE-Navy-L',59.99,NULL,12,'Color','Navy','Size','L',NULL,NULL,NULL,11,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(29,4,'Navy Hoodie - XL','HOODIE-Navy-XL',59.99,NULL,12,'Color','Navy','Size','XL',NULL,NULL,NULL,12,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(30,4,'White Hoodie - S','HOODIE-White-S',59.99,NULL,12,'Color','White','Size','S',NULL,NULL,NULL,13,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(31,4,'White Hoodie - M','HOODIE-White-M',59.99,NULL,12,'Color','White','Size','M',NULL,NULL,NULL,14,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(32,4,'White Hoodie - L','HOODIE-White-L',59.99,NULL,12,'Color','White','Size','L',NULL,NULL,NULL,15,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(33,4,'White Hoodie - XL','HOODIE-White-XL',59.99,NULL,12,'Color','White','Size','XL',NULL,NULL,NULL,16,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(34,5,'White Sneaker - Size 6','SNEAKER-WHITE-6',119.99,NULL,25,'Size','6',NULL,NULL,NULL,NULL,NULL,1,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(35,5,'White Sneaker - Size 7','SNEAKER-WHITE-7',119.99,NULL,25,'Size','7',NULL,NULL,NULL,NULL,NULL,2,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(36,5,'White Sneaker - Size 8','SNEAKER-WHITE-8',119.99,NULL,25,'Size','8',NULL,NULL,NULL,NULL,NULL,3,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(37,5,'White Sneaker - Size 9','SNEAKER-WHITE-9',119.99,NULL,25,'Size','9',NULL,NULL,NULL,NULL,NULL,4,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(38,5,'White Sneaker - Size 10','SNEAKER-WHITE-10',119.99,NULL,25,'Size','10',NULL,NULL,NULL,NULL,NULL,5,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(39,5,'White Sneaker - Size 11','SNEAKER-WHITE-11',119.99,NULL,25,'Size','11',NULL,NULL,NULL,NULL,NULL,6,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(40,5,'White Sneaker - Size 12','SNEAKER-WHITE-12',119.99,NULL,25,'Size','12',NULL,NULL,NULL,NULL,NULL,7,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(41,5,'White Sneaker - Size 13','SNEAKER-WHITE-13',119.99,NULL,25,'Size','13',NULL,NULL,NULL,NULL,NULL,8,'2026-02-09 13:14:27','2026-02-09 13:14:27');
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_id` int(11) DEFAULT NULL,
  `template_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `sku` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `inventory_quantity` int(11) DEFAULT 0,
  `inventory_tracking` tinyint(1) DEFAULT 1,
  `allow_backorder` tinyint(1) DEFAULT 0,
  `weight` decimal(10,3) DEFAULT NULL,
  `weight_unit` enum('kg','lb','oz','g') DEFAULT 'lb',
  `requires_shipping` tinyint(1) DEFAULT 1,
  `taxable` tinyint(1) DEFAULT 1,
  `status` enum('active','draft','archived') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_status` (`status`),
  KEY `idx_sku` (`sku`),
  KEY `content_id` (`content_id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE,
  CONSTRAINT `products_ibfk_3` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,3,0,NULL,'CLASSIC-TEE-001',39.99,49.99,NULL,50,1,0,NULL,'lb',1,1,'active','2026-02-09 13:14:27','2026-02-09 13:14:27'),(2,4,0,NULL,'DENIM-BLUE-001',89.99,119.99,NULL,50,1,0,NULL,'lb',1,1,'active','2026-02-09 13:14:27','2026-02-09 13:14:27'),(3,5,0,NULL,'LEATHER-JACKET-001',199.99,249.99,NULL,50,1,0,NULL,'lb',1,1,'active','2026-02-09 13:14:27','2026-02-09 13:14:27'),(4,6,0,NULL,'HOODIE-GRAY-001',59.99,79.99,NULL,50,1,0,NULL,'lb',1,1,'active','2026-02-09 13:14:27','2026-02-09 13:14:27'),(5,7,0,NULL,'SNEAKER-WHITE-001',119.99,149.99,NULL,50,1,0,NULL,'lb',1,1,'active','2026-02-09 13:14:27','2026-02-09 13:14:27');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `redirects`
--

DROP TABLE IF EXISTS `redirects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `redirects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source_path` varchar(500) NOT NULL,
  `target_path` varchar(500) NOT NULL,
  `status_code` int(11) DEFAULT 301,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `source_path` (`source_path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `redirects`
--

LOCK TABLES `redirects` WRITE;
/*!40000 ALTER TABLE `redirects` DISABLE KEYS */;
/*!40000 ALTER TABLE `redirects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'site_name','Modern Apparel','2026-02-09 13:14:27'),(2,'site_tagline','Premium Clothing & Lifestyle','2026-02-09 13:14:27'),(3,'site_url','http://localhost:3000','2026-02-09 13:14:27'),(4,'default_meta_title','Modern Apparel - Premium Clothing','2026-02-09 13:14:27'),(5,'default_meta_description','Discover our curated collection of modern apparel and lifestyle products','2026-02-09 13:14:27'),(6,'google_analytics_id','','2026-02-09 13:14:27'),(7,'robots_txt','User-agent: *\nAllow: /','2026-02-09 13:14:27'),(8,'home_page_id','1','2026-02-09 13:14:27'),(9,'tax_rate','0.08','2026-02-09 13:14:27'),(10,'shipping_flat_rate','9.99','2026-02-09 13:14:27'),(11,'currency','USD','2026-02-09 13:14:27'),(12,'stripe_public_key','pk_test_demo','2026-02-09 13:14:27'),(13,'stripe_secret_key','sk_test_demo','2026-02-09 13:14:27'),(14,'paypal_client_id','client_id_demo','2026-02-09 13:14:27'),(15,'paypal_client_secret','secret_demo','2026-02-09 13:14:27'),(16,'paypal_mode','sandbox','2026-02-09 13:14:27');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `regions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`regions`)),
  `content_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`),
  KEY `idx_content_type` (`content_type`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `templates`
--

LOCK TABLES `templates` WRITE;
/*!40000 ALTER TABLE `templates` DISABLE KEYS */;
INSERT INTO `templates` VALUES (1,'Homepage','pages/homepage.njk','Homepage with hero section','[{\"name\":\"hero_title\",\"type\":\"text\",\"label\":\"Hero Title\"},{\"name\":\"hero_subtitle\",\"type\":\"text\",\"label\":\"Hero Subtitle\"},{\"name\":\"hero_cta_text\",\"type\":\"text\",\"label\":\"CTA Button Text\"},{\"name\":\"hero_cta_link\",\"type\":\"text\",\"label\":\"CTA Button Link\"},{\"name\":\"intro_content\",\"type\":\"richtext\",\"label\":\"Introduction Content\"}]',NULL,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(2,'Standard Page','pages/standard.njk','Standard content page','[{\"name\":\"page_content\",\"type\":\"richtext\",\"label\":\"Page Content\"}]',NULL,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(3,'Product Page','products/product-single.njk','Product detail page','[{\"name\":\"description\",\"type\":\"richtext\",\"label\":\"Product Description\"},{\"name\":\"features\",\"type\":\"richtext\",\"label\":\"Features & Benefits\"}]',NULL,'2026-02-09 13:14:27','2026-02-09 13:14:27'),(4,'Blog Post','blog/blog-post.njk','Blog article template','[{\"name\":\"featured_image\",\"type\":\"image\",\"label\":\"Featured Image\"},{\"name\":\"excerpt\",\"type\":\"textarea\",\"label\":\"Excerpt\"},{\"name\":\"content\",\"type\":\"richtext\",\"label\":\"Article Content\"},{\"name\":\"author\",\"type\":\"text\",\"label\":\"Author Name\"}]',NULL,'2026-02-09 13:14:27','2026-02-09 13:14:27');
/*!40000 ALTER TABLE `templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `role` enum('admin','editor','viewer') DEFAULT 'editor',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@example.com','$2a$10$AII3jnDbUrLcFon.sEdIGO0C5pjPswF1QmlwP4wf./uX4BaW1BShW','Admin User','admin','2026-02-09 13:14:27','2026-02-09 13:14:27');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-09  5:24:17
