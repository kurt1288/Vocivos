import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CargoType, Ship } from '../../Api/types';
import { RootState } from '../../store';
import { WorkerContext } from '../../WorkerContext';

const Worth = () => {
   const [apiWorker] = useContext(WorkerContext);
   const { token, username } = useSelector((state:RootState) => state.account);
   const { marketData } = useSelector((state:RootState) => state);
   const { credits, ships, loans } = useSelector((state:RootState) => state.user);
   const [uniqueShipCount, setUniqueShipCount] = useState<{ shipType: string; uniques: number; }[]>([]);
   const [shipPrices, setShipPrices] = useState<Ship[]>([]);
   const [cargos, setCargos] = useState<{ type: CargoType, quantity: number, bestValue: number }[]>([]);
   const [totalWorth, setTotalWorth] = useState(0);

   useEffect(() => {
      const getShipPrices = async () => {
         const getShips = await apiWorker.availableShips();
         setShipPrices(getShips.ships);
      };

      getShipPrices();
   }, []);

   useEffect(() => {
      const shipTypes = new Map(ships.map((ship) => [ship.type, []]));

      const results = Array.from(shipTypes.entries(), ([shipType]) => ({ shipType, uniques: ships.filter((x) => x.type === shipType).length }));
      setUniqueShipCount(results);

      const cargosArray: { type: CargoType, quantity: number, bestValue: number }[] = [];
      Object.values(CargoType).forEach((cargo) => {
         const good = {
            type: cargo,
            quantity: 0,
            bestValue: 0,
         };
         const shipsWithCargoType = ships.filter((x) => x.cargo.find((y) => y.good === cargo));
         shipsWithCargoType.forEach((ship) => {
            good.quantity += ship.cargo.find((x) => x.good === cargo)?.quantity as number;
         });
         const markets = marketData.filter((x) => x.planet.marketplace.find((y) => y.symbol === cargo));
         good.bestValue = Math.max(...markets?.map((market) => market.planet.marketplace.find((marketCargo) => marketCargo.symbol === cargo)?.sellPricePerUnit as number));
         cargosArray.push(good);
      });
      setCargos(cargosArray);
   }, [ships]);

   useEffect(() => {
      let total = credits;
      uniqueShipCount.forEach((ship) => {
         total += ship.uniques * (shipPrices.find((x) => x.type === ship.shipType)?.purchaseLocations[0].price as number);
      });
      cargos.forEach((cargo) => {
         total += (cargo.bestValue * cargo.quantity);
      });
      loans.forEach((loan) => {
         total -= loan.repaymentAmount;
      });
      setTotalWorth(total);
   }, [credits, uniqueShipCount, cargos, loans, shipPrices]);

   return (
      <React.Fragment>
         <table className="table-auto w-3/4 mx-auto">
            <thead>
               <tr className="bg-gray-300 text-gray-700 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Commodity</th>
                  <th className="py-3 px-6 text-left">Type</th>
                  <th className="py-3 px-6 text-center">Quantity</th>
                  <th className="py-3 px-6 text-right">Total Value</th>
               </tr>
            </thead>
            <tbody className="bg-gray-700 text-gray-200 text-sm font-light">
               <tr className="border-b border-gray-500 hover:bg-gray-900">
                  <td className="py-3 px-6 text-left whitespace-nowrap">Credits</td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">Cash</td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">-</td>
                  <td className="py-3 px-6 text-right whitespace-nowrap">{ credits.toLocaleString() }</td>
               </tr>
               { loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-gray-500 hover:bg-gray-900">
                     <td className="py-3 px-6 text-left whitespace-nowrap">Loan</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">Liability</td>
                     <td className="py-3 px-6 text-center whitespace-nowrap">-</td>
                     <td className="py-3 px-6 text-red-500 text-right whitespace-nowrap">-{ loan.repaymentAmount.toLocaleString() }</td>
                  </tr>
               ))}
               { uniqueShipCount.map((ship) => (
                  <tr key={ship.shipType} className="border-b border-gray-500 hover:bg-gray-900">
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ ship.shipType }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">Ship</td>
                     <td className="py-3 px-6 text-center whitespace-nowrap">{ ship.uniques.toLocaleString() }</td>
                     <td className="py-3 px-6 text-right whitespace-nowrap">{ (ship.uniques * (shipPrices.find((x) => x.type === ship.shipType)?.purchaseLocations[0].price as number)).toLocaleString() }</td>
                  </tr>
               ))}
               { cargos.map((cargo) => {
                  if (cargo.quantity > 0) {
                     return (
                        <tr key={cargo.type} className="border-b border-gray-500 hover:bg-gray-900">
                           <td className="py-3 px-6 text-left whitespace-nowrap">{ cargo.type }</td>
                           <td className="py-3 px-6 text-left whitespace-nowrap">Cargo</td>
                           <td className="py-3 px-6 text-center whitespace-nowrap">{ cargo.quantity.toLocaleString() }</td>
                           <td className="py-3 px-6 text-right whitespace-nowrap">{ (cargo.bestValue * cargo.quantity).toLocaleString() }</td>
                        </tr>
                     );
                  }
                  return null;
               })}
            </tbody>
            <tfoot className="bg-gray-700 text-gray-200 text-sm font-light">
               <tr className="border-b border-gray-500 hover:bg-gray-900">
                  <td className="py-3 px-6 text-left whitespace-nowrap uppercase">Total</td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">-</td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">-</td>
                  <td className="py-3 px-6 text-right whitespace-nowrap">{ totalWorth.toLocaleString() }</td>
               </tr>
            </tfoot>
         </table>
      </React.Fragment>
   );
};

export default Worth;
