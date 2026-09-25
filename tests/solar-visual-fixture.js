// Presentation-only fixtures: never loaded into a player save or simulator.
import { voyageFixture } from './orbital-colony-cases.js';
import { SOLAR_TALENTS } from '../src/solar-colony.js';
import { FACILITIES } from '../src/solar-industry.js';
export function visualFixture({developed=false}={}){
  const s=voyageFixture(),o=s.orbital;o.elapsed=0;o.completionAt=-100;
  const w=o.solar.colonies.mars;w.phase='living';w.remaining=0;w.growth={step:0,progress:0};
  o.solar.talents.dome=3;o.solar.flights=[];
  w.civs=[1,2,3,4,5].map((age,i)=>({id:`visual-${i}`,age,arrivedAt:-10}));
  for(const key of Object.keys(FACILITIES))o.solar.facilities[key]=1;
  if(developed){for(const [key,t]of Object.entries(SOLAR_TALENTS))if(!t.facility&&!t.planned)o.solar.talents[key]=t.costs.length;
    for(const key of Object.keys(FACILITIES))o.solar.facilities[key]=3;
    w.uplifted=[{id:'uplifted',age:5,upliftedAt:-20}];w.growth={step:11,progress:0};}
  return s;
}
export const WORLD_EFFECTS={
  mercury:['terminator','mercuryDriver','smelter','ironCore','coronaProbe'],
  venus:['cloudCities','sunshade','lightning'],belt:['swarm','ceresDepot','vestaMines','redirect'],
  jupiter:['heliumScoop','stormRider','magnetosphere','io','europa','ganymede','callisto'],
  saturn:['ringHarvest','ringDocks','hexagon','enceladus','rhea','iapetus'],
  uranus:['tiltPower','diamondRain','uranusBeacon','miranda','ariel','titania','oberon'],neptune:['windFarm','ringArcs','darkSpot','heliopause','proteus','triton','nereid'],
  pluto:['cometCapture','coldArchive','kuiperSurvey','arrokoth','charon','nix','hydra'],mars:['terraform','phobos','deimos'],
};
