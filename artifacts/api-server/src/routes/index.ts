import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import batchesRouter from "./batches";
import subjectsRouter from "./subjects";
import lecturesRouter from "./lectures";
import notesRouter from "./notes";
import testsRouter from "./tests";
import noticesRouter from "./notices";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(batchesRouter);
router.use(subjectsRouter);
router.use(lecturesRouter);
router.use(notesRouter);
router.use(testsRouter);
router.use(noticesRouter);
router.use(adminRouter);

export default router;
