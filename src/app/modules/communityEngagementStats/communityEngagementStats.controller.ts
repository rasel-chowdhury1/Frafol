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
  const result = await CommunityEngagementService.addCommentOrReply(
    req.params.id,
    req.user.userId,
    req.body.text,
    req.body.commentId
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Comment added",
    data: result,
  });
});

const addReply = catchAsync(async (req: Request, res: Response) => {
  const {userId} = req.user;
  const {commentId} = req.params;
  const {communityId,text} = req.body;
  const result = await CommunityEngagementService.addReply(
    communityId,
    commentId,
    userId,
    text
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
