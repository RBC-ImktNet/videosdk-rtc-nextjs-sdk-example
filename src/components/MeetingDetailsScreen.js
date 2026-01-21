import { CheckIcon, ClipboardIcon } from "@heroicons/react/outline";
import React, { useState } from "react";
import useResponsiveSize from "../utils/useResponsiveSize";

export function MeetingDetailsScreen({
  onClickJoin,
  onClickCreateMeeting,
  participantName,
  setParticipantName,
  videoTrack,
  setVideoTrack,
  onClickStartMeeting,
  evidenceOk,
  evidenceLoading,
  evidenceError,
}) {
  const [meetingId, setMeetingId] = useState("");
  const [meetingIdError, setMeetingIdError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [iscreateMeetingClicked, setIscreateMeetingClicked] = useState(false);
  const [isJoinMeetingClicked, setIsJoinMeetingClicked] = useState(false);

  const padding = useResponsiveSize({
    xl: 6,
    lg: 6,
    md: 6,
    sm: 4,
    xs: 1.5,
  });

  const startDisabled =
    participantName.length < 3 ||
    (iscreateMeetingClicked && !evidenceOk) ||
    evidenceLoading;

  return (
    <div className="flex flex-1 flex-col w-full" style={{ padding }}>
      {iscreateMeetingClicked ? (
        <div className="border border-solid border-gray-400 rounded-xl px-4 py-3 flex items-center justify-center">
          <p className="text-white text-base">Meeting code: {meetingId}</p>
          <button
            className="ml-2"
            onClick={() => {
              navigator.clipboard.writeText(meetingId);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 3000);
            }}
          >
            {isCopied ? (
              <CheckIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ClipboardIcon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      ) : isJoinMeetingClicked ? (
        <>
          <input
            defaultValue={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="Enter meeting Id"
            className="px-4 py-3 bg-gray-650 rounded-xl text-white w-full text-center"
          />
          {meetingIdError && (
            <p className="text-xs text-red-600">Please enter valid meetingId</p>
          )}
        </>
      ) : null}

      {(iscreateMeetingClicked || isJoinMeetingClicked) && (
        <>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Enter your name"
            className="px-4 py-3 mt-5 bg-gray-650 rounded-xl text-white w-full text-center"
          />

          {iscreateMeetingClicked && !evidenceOk ? (
            <p className="text-xs text-red-500 mt-2">
              {evidenceLoading ? "Validando evidências..." : "evidence is required"}
              {evidenceError ? ` — ${evidenceError}` : ""}
            </p>
          ) : null}

          <button
            disabled={startDisabled}
            className={`w-full ${
              startDisabled ? "bg-gray-650" : "bg-purple-350"
            } text-white px-2 py-3 rounded-xl mt-5`}
            onClick={() => {
              if (iscreateMeetingClicked) {
                if (videoTrack) {
                  videoTrack.stop();
                  setVideoTrack(null);
                }
                onClickStartMeeting();
              } else {
                if (meetingId.match("\\w{4}\\-\\w{4}\\-\\w{4}")) {
                  onClickJoin(meetingId);
                } else setMeetingIdError(true);
              }
            }}
          >
            {iscreateMeetingClicked ? "Start a meeting" : "Join a meeting"}
          </button>
        </>
      )}

      {!iscreateMeetingClicked && !isJoinMeetingClicked && (
        <div className="w-full md:mt-0 mt-4 flex items-center justify-center flex-col">
          <button
            className="w-full bg-purple-350 text-white px-2 py-3 rounded-xl"
            onClick={async () => {
              try {
                console.log("[UI] Create a meeting: clicked");
                const id = await onClickCreateMeeting();
                console.log("[UI] Create a meeting: returned id =", id);

                if (!id) {
                  alert("CreateMeeting retornou vazio. Verifique logs no console.");
                  return;
                }

                setMeetingId(id);
                setIscreateMeetingClicked(true);
              } catch (e) {
                console.error("[UI] Create a meeting error:", e);
                alert(String(e?.message || e));
              }
            }}
          >
            Create a meeting
          </button>

          <button
            className="w-full bg-gray-650 text-white px-2 py-3 rounded-xl mt-5"
            onClick={() => setIsJoinMeetingClicked(true)}
          >
            Join a meeting
          </button>
        </div>
      )}
    </div>
  );
}
