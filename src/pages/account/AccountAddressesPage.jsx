import { useState } from 'react';
import { getAddressesFromStorage } from '@/utils/addressStorage';
import { MapPin, Star } from 'lucide-react';

export default function AccountAddressesPage() {
  const [addresses] = useState(() => getAddressesFromStorage());

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-secondary">
        <MapPin className="h-6 w-6" aria-hidden />
        <h1 className="text-2xl font-semibold text-primary sm:text-3xl">Addresses</h1>
      </div>
      <p className="mt-1 text-sm text-secondary">
        Addresses are loaded from this device. Add or edit them in Settings.
      </p>

      {addresses.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-quaternary p-8 text-center">
          <MapPin className="mx-auto h-12 w-12 text-tertiary" aria-hidden />
          <p className="mt-4 font-medium text-primary">No addresses saved</p>
          <p className="mt-1 text-sm text-secondary">
            Add an address in Settings to see it here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {addresses.map((addr) => {
            const street = addr.streetAddress ?? addr.street_address;
            const city = addr.city;
            const state = addr.state;
            const postal = addr.postalCode ?? addr.postal_code;
            const country = addr.country;
            const type = addr.addressType ?? addr.address_type;
            const isDefault = addr.isDefault ?? addr.default;
            return (
              <li
                key={addr.id}
                className="rounded-2xl border border-border bg-quaternary p-6 shadow-sm"
              >
                {isDefault && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                    <Star className="h-3 w-3" aria-hidden /> Default
                  </span>
                )}
                <p className="font-medium text-primary">{street}</p>
                <p className="mt-1 text-sm text-secondary">
                  {[city, state, postal, country].filter(Boolean).join(', ')}
                </p>
                {type && (
                  <p className="mt-2 text-xs text-secondary">{type}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-sm text-secondary">
        To add, edit, or set a default address, go to Settings.
      </p>
    </div>
  );
}
