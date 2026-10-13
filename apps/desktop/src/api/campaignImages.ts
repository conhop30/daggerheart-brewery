import { apiClient } from './client';

// One picture in a Campaign's image folder (maps, mostly). The file itself
// lives in the app's campaign-images folder; see electron/main.js.
export interface CampaignImage {
  id: string;
  campaignId: string;
  name: string;
  fileName: string;
}

/** What an <img> points at to show one. */
export const campaignImageUrl = (image: CampaignImage) => `dhmedia://campaign-image/${image.fileName}`;

export const campaignImagesApi = {
  listByCampaign: async (campaignId: string) =>
    (await apiClient.list<CampaignImage>('campaignImages')).filter((i) => i.campaignId === campaignId),
  /** Opens the file picker. */
  import: (campaignId: string) => apiClient.importCampaignImages<CampaignImage>(campaignId),
  /** Files dropped in from the OS. */
  importPaths: (campaignId: string, filePaths: string[]) => apiClient.importCampaignImagePaths<CampaignImage>(campaignId, filePaths),
  rename: (id: string, name: string) => apiClient.update<CampaignImage>('campaignImages', id, { name }),
  /** Removes the picture and its file. */
  remove: (id: string) => apiClient.removeCampaignImage(id),
};
