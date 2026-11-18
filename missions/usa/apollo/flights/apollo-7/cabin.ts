import { blockIICabin } from '../../vehicles/cabin.ts';

// Launch-vehicle inches to Xc zero, from the SA-205 stage lengths and SM stations.
export const { cabin, lights } = blockIICabin((80.2 + 58.4) * 12 + 36 + 28 * 12 + (1000 - 838));

cabin.attitudeBalls = ['Ball_ApolloFDAI1', 'Ball_ApolloFDAI2'];
