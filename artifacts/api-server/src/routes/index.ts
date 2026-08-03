import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import storefrontRouter from "./storefront";
import imagesRouter from "./images";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/stores", storefrontRouter);
router.use(imagesRouter);

export default router;
