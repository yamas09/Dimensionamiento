import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sfvRouter from "./sfv";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sfv", sfvRouter);

export default router;
