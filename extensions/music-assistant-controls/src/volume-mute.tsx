import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  try {
    const client = new MusicAssistantClient();

    // Get current mute state before
    const playerBefore = await client.getPlayer(selectedPlayerID);
    const mutedBefore = playerBefore.volume_muted ?? false;

    // Toggle mute state
    await client.volumeMute(selectedPlayerID, !mutedBefore);

    // Get new mute state after
    const playerAfter = await client.getPlayer(selectedPlayerID);
    const mutedAfter = playerAfter.volume_muted ?? false;

    // Show success toast with state change
    const statusBefore = mutedBefore ? "MUTED" : "UNMUTED";
    const statusAfter = mutedAfter ? "MUTED" : "UNMUTED";

    await showToast({
      style: Toast.Style.Success,
      title: `🔇 ${statusBefore} → ${statusAfter}`,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
