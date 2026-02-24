import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";

export default async function main() {
  const selectedPlayerID = await getSelectedQueueID();
  if (!selectedPlayerID) return;

  try {
    const client = new MusicAssistantClient();

    // Get current player and check if mute is supported
    const player = await client.getPlayer(selectedPlayerID);
    
    if (!client.supportsMuteControl(player)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Mute not supported",
        message: "This player does not support mute control",
      });
      return;
    }

    // Get current mute state
    const mutedBefore = player.volume_muted ?? false;

    // Toggle mute state
    await client.volumeMute(selectedPlayerID, !mutedBefore);

    // Get new mute state after
    const playerAfter = await client.getPlayer(selectedPlayerID);
    const mutedAfter = playerAfter.volume_muted ?? false;

    // Show success toast with icon
    const icon = mutedAfter ? "🔇" : "🔊";

    await showToast({
      style: Toast.Style.Success,
      title: icon,
    });
  } catch (error) {
    showFailureToast(error, {
      title: "💥 Something went wrong!",
    });
  }
}
