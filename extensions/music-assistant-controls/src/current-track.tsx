import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { selectedPlayerKey, StoredQueue } from "./use-selected-player-id";
import { RepeatMode } from "./external-code/interfaces";
import React from "react";

export default function CurrentTrackCommand() {
  const client = new MusicAssistantClient();
  const { value: storedQueueId } = useLocalStorage<StoredQueue>(selectedPlayerKey);

  const {
    isLoading,
    data: queueData,
    revalidate,
  } = useCachedPromise(
    async () => {
      const queues = await client.getActiveQueues();
      const activeQueue = client.findActiveQueue(queues, storedQueueId);
      return activeQueue;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const toggleShuffle = async () => {
    if (!queueData) return;
    try {
      const wasEnabled = queueData.shuffle_enabled;
      await client.toggleShuffle(queueData.queue_id);
      await showToast({
        style: Toast.Style.Success,
        title: "Shuffle Toggled",
        message: wasEnabled ? "Shuffle disabled" : "Shuffle enabled",
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Shuffle",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const cycleRepeat = async () => {
    if (!queueData) return;
    try {
      await client.cycleRepeatMode(queueData.queue_id);
      const nextMode =
        queueData.repeat_mode === RepeatMode.OFF ? "ONE" : queueData.repeat_mode === RepeatMode.ONE ? "ALL" : "OFF";
      await showToast({
        style: Toast.Style.Success,
        title: "Repeat Mode Changed",
        message: `Repeat mode set to ${nextMode}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Change Repeat Mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const addToFavorites = async () => {
    if (!queueData?.current_item) return;
    try {
      await client.addToFavorites(queueData.current_item.uri);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
        message: queueData.current_item.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Favorites",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const addToPlaylist = async (playlistId: string | number, playlistName: string) => {
    if (!queueData?.current_item) return;
    try {
      await client.addTracksToPlaylist(playlistId, [queueData.current_item.uri]);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Playlist",
        message: `"${queueData.current_item.name}" added to "${playlistName}"`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Playlist",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const { data: playlists } = useCachedPromise(async () => await client.getLibraryPlaylists(20, 0), [], {
    keepPreviousData: true,
    initialData: [],
  });

  // Build markdown content for the detail view
  const buildMarkdown = (): string => {
    if (!queueData?.current_item) {
      return "# No Track Playing\n\nNo active track found on the selected player.";
    }

    const item = queueData.current_item;
    const albumArt = client.getQueueAlbumArt(queueData);
    const duration = client.formatDuration(item.duration);

    // Build markdown with album art and track details
    let markdown = "";

    // Add album artwork if available (centered, large)
    if (albumArt) {
      markdown += `<img src="${albumArt}" width="300" height="300" />\n\n`;
    }

    // Add track information
    markdown += `# ${item.name}\n\n`;

    if (item.artists && item.artists.length > 0) {
      const artistNames = item.artists.map((a) => a.name).join(", ");
      markdown += `**Artist:** ${artistNames}\n\n`;
    }

    if (item.album) {
      markdown += `**Album:** ${item.album.name}\n\n`;
    }

    markdown += `**Duration:** ${duration}\n\n`;

    // Queue and player information
    markdown += `---\n\n`;
    markdown += `**Queue:** ${queueData.display_name}\n\n`;
    markdown += `**State:** ${queueData.state.toUpperCase()}\n\n`;

    // Playback settings
    markdown += `---\n\n`;
    markdown += `**${client.getShuffleText(queueData.shuffle_enabled)}**\n\n`;
    markdown += `**${client.getRepeatText(queueData.repeat_mode)}**\n\n`;

    return markdown;
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown()}
      navigationTitle="Current Track"
      actions={
        <ActionPanel>
          {queueData && (
            <>
              <ActionPanel.Section title="Queue Controls">
                <Action
                  title="Toggle Shuffle"
                  icon={Icon.Shuffle}
                  onAction={toggleShuffle}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action
                  title="Cycle Repeat Mode"
                  icon={Icon.Repeat}
                  onAction={cycleRepeat}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>

              {queueData.current_item && (
                <ActionPanel.Section title="Track Actions">
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Heart}
                    onAction={addToFavorites}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  {playlists && playlists.length > 0 && (
                    <ActionPanel.Submenu
                      title="Add to Playlist"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                    >
                      {playlists.map((playlist) => (
                        <Action
                          key={playlist.item_id}
                          title={playlist.name}
                          onAction={() => addToPlaylist(playlist.item_id, playlist.name)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                </ActionPanel.Section>
              )}

              <ActionPanel.Section title="Refresh">
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
