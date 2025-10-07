import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CommunityEngagementService } from "./communityEngagementStats.service";

const likeCommunity = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityEngagementService.likeCommunity(req.params.id, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community liked",
    data: result,
  });
});

const unlikeCommunity = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityEngagementService.unlikeCommunity(req.params.id, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Community unliked",
    data: result,
  });
});

const addComment = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityEngagementService.addComment(
    req.params.id,
    req.user.userId,
    req.body.text
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Comment added",
    data: result,
  });
});

const addReply = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityEngagementService.addReply(
    req.params.id,
    req.params.commentId,
    req.user.userId,
    req.body.text
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reply added",
    data: result,
  });
});

const addViewer = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityEngagementService.addViewer(req.params.id, req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Viewer added",
    data: result,
  });
});

export const CommunityEngagementController = {
  likeCommunity,
  unlikeCommunity,
  addComment,
  addReply,
  addViewer,
};
